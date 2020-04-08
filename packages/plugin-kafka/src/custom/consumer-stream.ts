import { Readable } from 'readable-stream'
import * as assert from 'assert'
import { once } from 'events'
import { find } from 'lodash'
import {
  map, resolve, // race,
  promisify, TimeoutError, delay,
} from 'bluebird'
import { helpers as ErrorHelpers } from 'common-errors'
// import { inspect } from 'util'

import { LoggerPlugin } from '@microfleet/core'

import {
  KafkaConsumer, ConsumerStreamMessage,
  TopicPartition, CODES as KafkaCodes,
  KafkaError,
  LibrdKafkaError,
} from './rdkafka-extra'

import { ConsumerStreamOptions } from '@microfleet/plugin-kafka-types'

export interface CommitOffsetTracker {
  [topicNamePartition: string]: TopicPartition | null | undefined
}

const { ERRORS: KafkaErrorCodes } = KafkaCodes
const {
  ERR__ASSIGN_PARTITIONS,
  ERR__REVOKE_PARTITIONS,
  ERR_UNKNOWN_MEMBER_ID,
  ERR__STATE,
} = KafkaErrorCodes

export const EVENT_ACK = 'acknowledged'
export const EVENT_CONSUMED = 'consumed'
export const EVENT_DESTROYING = 'destroying'
export const EVENT_OFFSET_COMMIT_ERROR = 'offset.commit.error'

export const OffsetCommitError = ErrorHelpers.generateClass('OffsetCommitError', {
  args: ['partitions', 'inner_error'],
  generateMessage: function generateMessage(this: typeof OffsetCommitError) {
    // @ts-ignore
    if (typeof this.inner_error === 'number') {
      return `Kafka critical error: 25`
    }
    // @ts-ignore
    return `Kafka critical error: ${this.inner_error.message}`
  },
})

export const UncommittedOffsetsError = ErrorHelpers.generateClass('UncommittedOffsetsError', {
  args: ['offset_tracker', 'unacknowledged_tracker'],
  generateMessage: () => 'Uncomitted offsets left',
})

export const CriticalErrors: number[] = [
  ERR_UNKNOWN_MEMBER_ID,
]

/**
 * Helps to read data from Kafka topic.
 * Allows to track consumer offset position and exit on EOF
 * Replaces `node-rdkafka/ConsumerStream`
 */
export class KafkaConsumerStream extends Readable {
  private static trackingKey(topicPart: TopicPartition): string {
    return `${topicPart.topic}_${topicPart.partition}`
  }

  public consumer: KafkaConsumer
  private config: ConsumerStreamOptions
  private offsetQueryTimeout: number
  private offsetTracker: CommitOffsetTracker
  private unacknowledgedTracker: CommitOffsetTracker
  private log?: LoggerPlugin['log']

  private messages: any[]
  private consuming: boolean
  private destroying: boolean
  private autoStore: boolean
  private readStarted: boolean
  private hasError: boolean

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: KafkaConsumer, config: ConsumerStreamOptions, log?: LoggerPlugin['log']) {
    assert(consumer.isConnected(), 'consumer should be connected')
    assert(consumer instanceof KafkaConsumer, 'should be intance of KafkaConsumer')

    const highWaterMark = config.streamAsBatch ? 1 : config.fetchSize || 1
    super({ highWaterMark, objectMode: true })

    this.log = log
    this.config = config
    this.consuming = false
    this.destroying = false
    this.readStarted = false
    this.hasError = false

    this.offsetQueryTimeout = config.offsetQueryTimeout || 200
    this.offsetTracker = Object.create(null)
    this.unacknowledgedTracker = Object.create(null)
    this.consumer = consumer as KafkaConsumer
    this.autoStore = config['enable.auto.offset.store'] !== false

    this.messages = []

    this.consumer.on('rebalance', this.handleRebalance.bind(this))
    this.consumer.on('offset.commit', this.handleOffsetCommit.bind(this))

    this.consumer.on('disconnected', async () => {
      if (this.destroying) {
        this.log?.debug('disconnected event already destroying')
        return
      }

      const hasOutstandingAcks = this.hasOutstandingAcks()
      this.log?.debug({ hasOutstandingAcks }, 'disconnected event from consumer')

      if (hasOutstandingAcks) {
        this.destroy(new UncommittedOffsetsError(this.offsetTracker, this.unacknowledgedTracker))
        return
      }

      this.destroy()
    })

    const topics = Array.isArray(config.topics) ? config.topics! : [config.topics!]
    this.consumer.subscribe(topics)
  }

  public async _read(): Promise<void> {
    if (this.messages.length > 0) {
      const message = this.messages.shift()!
      this.push(message)
      return
    }

    if (! this.readStarted) {
      this.readStarted = true
      this.readLoop()
      return
    }
  }

  public _destroy(err: Error | null | undefined, callback?: (err: Error | null) => void): void {
    this.log?.debug({ err, conn: this.consumer.isConnected() }, '_destroy close consumer stream')

    if (!this.consumer.isConnected()) {
      this.log?.debug('_destroy consumer already disconnected', callback)
      if (callback) callback(err || null)
      return
    }

    this.log?.debug('_destroy SET consumer disconnect callback', callback)

    if (!this.inDestroyingState()) {
      this.consumer.assign([])
    }

    this.consumer.disconnect((errCB) => {
      if (!this._readableState.endEmitted && !this.hasError) {
        this.push(null)
      }
      this.log?.debug({ err, errCB, callback }, '_destroy consumer disconnect callback')
      if (callback) callback(err || null)
    })
  }

  public destroy(err?: Error | undefined, callback?: ((error: Error | null) => void) | undefined): this {
    this.log?.debug({ err, callback, destroyed: this.destroyed, destroying: this.destroying }, 'destroy called')

    if (this.destroying) {
      this.log?.debug({ err, callback }, 'in destroying state')

      this.once('close', () => {
        this.log?.debug('destroy this once close')
        if (callback) callback(err || null)
      })
      return this
    }

    this.destroying = true

    if (err) {
      // invalidate ack waits
      this.hasError = true
      this.consuming = false
      this.emit(EVENT_DESTROYING)
    }

    const superDestroy = (_?: any) => {
      this.log?.debug({ err, callback }, 'superDestroy')
      super.destroy(err)
    }

    if (this.consuming) {
      resolve(once(this, EVENT_CONSUMED))
        .timeout(5000, 'offset commit timeout on shutdown')
        .then(() => {
          this.log?.debug('destroy - event received destroying')
          superDestroy()
        })
        .catch((timeoutError: TimeoutError) => {
          this.log?.debug({ err: timeoutError }, 'destroy - promise error')
          super.destroy(timeoutError, callback)
        })
    } else {
      process.nextTick(() => {
        superDestroy()
      })
    }

    return this
  }

  public close(cb?: (err?: Error | null) => void): void {
    this.log?.debug('close called')

    if (this.destroyed) {
      this.log?.error('close - already destroyed')
      if (cb) cb()
      return
    }

    this.once('close', () => {
      this.log?.debug('close CB')
      if (cb) cb()
    })
    this.destroy()
  }

  async closeAsync(): Promise<void> {
    this.log?.debug('close async called')
    await promisify(this.close, { context: this })()
    this.log?.debug('close async finished')
  }

  private inDestroyingState(): boolean {
    return this.consumerDisconnected() || this.destroying
  }

  private consumerDisconnected(): boolean {
    return this.consumer._isDisconnecting || !this.consumer.isConnected()
  }

  private pauseConsumer() {
    if (this.consumerDisconnected()) {
      this.log?.debug('skip pause on destroyed status')
      return
    }
    this.consumer.pause(this.consumer.assignments())
  }

  private resumeConsumer() {
    if (this.consumerDisconnected()) {
      this.log?.debug('skip resume on destroyed status')
      return
    }
    this.consumer.resume(this.consumer.assignments())
  }

  private async handleOffsetCommit (err: Error, partitions: TopicPartition[]): Promise<void> {
    // process.stdout.write(`\n====Commit:====\n${inspect({ err, partitions }, { colors: true })} \n=====\n`)
    this.log?.info({ err, partitions }, 'offset.commit')

    if (err) {
      const wrappedError = new OffsetCommitError(partitions, err)
      this.emit(EVENT_OFFSET_COMMIT_ERROR, wrappedError)

      // Should be Error but current node-rdkafka version returns error code as number
      const code = typeof err === 'number' ? err : (err as unknown as KafkaError).code

      if (CriticalErrors.includes(code)) {
        this.log?.error({ err: wrappedError }, 'critical commit error')
        setImmediate(() => {
          this.destroy(wrappedError)
        })
      }

      return
    }

    this.updatePartitionOffsets(partitions, this.offsetTracker)

    // once all acks were processed - be done with it
    if (!this.hasOutstandingAcks()) {
      this.log?.info({ destroying: this.destroying }, 'checking eof after all acks received')
      await this.checkEof()
      this.log?.info('commit +ack')
      this.consuming = false
      // notify that received chunk processed
      this.emit(EVENT_CONSUMED)
      return
    }
  }

  private async handleRebalance (err: KafkaError, assignments: TopicPartition[] = []) {
    this.log?.info({ err, assignments }, 'rebalance')
    process.nextTick(async () => {
      switch (err.code) {
        case ERR__ASSIGN_PARTITIONS:
          this.updatePartitionOffsets(assignments, this.offsetTracker)
          // early exit if all topics partitions read and offsets maxed
          await this.checkEof()
          break

        case ERR__REVOKE_PARTITIONS:
          // save offsets if consumer starts diconnect process
          if (!this.consumerDisconnected()) {
            this.cleanPartitionOffsets(assignments, this.offsetTracker)
            this.cleanPartitionOffsets(assignments, this.unacknowledgedTracker)
          }
          break

        default:
          this.emit('rebalance.error', err)
          return
      }
    })
  }

  private handleIncomingMessages(messages: ConsumerStreamMessage[]): void {
    const { unacknowledgedTracker, offsetTracker, autoStore } = this
    this.log?.warn('pausing stream - handleIncomingMessages')
    this.consuming = true
    this.pauseConsumer()

    for (const message of messages) {
      const topicPartition = {
        topic: message.topic,
        partition: message.partition,
        offset: message.offset + 1,
      }

      this.updatePartitionOffsets([topicPartition], unacknowledgedTracker)

      if (autoStore) this.consumer.offsetsStore([topicPartition])
      if (!this.config.streamAsBatch) this.messages.push(message)
    }

    if (this.config.streamAsBatch) this.messages.push(messages)

    this.log?.debug({ messages }, 'received messages')
    this.log?.debug({ offsetTracker, unacknowledgedTracker }, 'current tracker')

    // transfer messages from local buffer to the stream buffer
    this._read()
  }

  // we must loop forever
  private async readLoop(): Promise<void> {
    // when consumer disconnecting it throws Error: KafkaConsumer is not connected
    if (this.consumerDisconnected()) {
      this.log?.debug('stopping read loop read on destroyed status')
      return
    }

    const bufferAvailable = this._readableState.highWaterMark - this._readableState.length
    const fetchSize = this.config.streamAsBatch ? this.config.fetchSize! : bufferAvailable

    // this.log?.debug(
    //   {
    //     watermark: this._readableState.highWaterMark,
    //     length: this._readableState.length,
    //     messages: this.messages.length,
    //   },
    //   `CONSUME... ${fetchSize}`
    // )

    try {
      const messages = await this.consumer.consumeAsync(fetchSize)

      if (messages.length > 0) this.handleIncomingMessages(messages)
      if (this.config.waitInterval) await delay(this.config.waitInterval)

      this.readLoop()
    } catch (err) {
      this.log?.error({ err }, 'consume error')
      this.destroy(err)
    }
  }

  private async checkEof(): Promise<void> {
    this.log?.debug(
      {
        isDisconnecting: this.consumer._isDisconnecting,
        isConnected: this.consumer.isConnected(),
        destroying: this.destroying,
      },
      'checking eof'
    )

    if (this.inDestroyingState()) return

    try {
      const eof = await this.allMessagesRead()
      this.log?.debug({ eof }, 'eof return')

      if (eof) {
        this.push(null)
        this.log?.debug('eof reached - closed')
        return
      }

      if (this.inDestroyingState()) return
      this.resumeConsumer()
      this.log?.debug('no eof - consuming')
    } catch (err) {
      this.log?.error({ err }, 'fatal err - destroying stream')
      this.emit('error', err)
    }
  }

  /**
   * Detects EOF of consumed topic partitions
   * @param operationTimeout KafkaClient.committed and KafkaClient.queryWatermarkOffsets timeout
   */
  private async allMessagesRead(): Promise<boolean> {
    const { consumer } = this

    const assignments: TopicPartition[] = consumer.assignments()

    // consumer didn't received assignment
    // this happens when consumer count greater than partition count
    // or Kafka rebalance in progress
    if (assignments.length === 0) {
      this.log?.error('allMessagesRead no assignments')
      return false
    }

    this.log?.debug({ destroying: this.destroying, consumerDis: this.consumerDisconnected() }, 'query positions')
    try {
      const localPositions = await this.getPositions(assignments)
      const remoteOffsets = await map(assignments, async ({ topic, partition }) => {
        const offsets = await consumer.queryWatermarkOffsetsAsync(topic, partition, this.offsetQueryTimeout)

        return {
          topic,
          partition,
          ...offsets,
        }
      })

      const partitionStatus = remoteOffsets.map((offsetInfo: any) => {
        const { highOffset, topic, partition } = offsetInfo

        // if no high offset - means no message
        if (highOffset < 0) {
          return true
        }

        const localPosition = find(localPositions, { topic, partition })
        const localOffset = localPosition!.offset || 0

        return localPosition ? highOffset === localOffset : false
      })

      this.log?.debug({ assignments, localPositions, remoteOffsets, partitionStatus }, 'verifying positions')

      return !partitionStatus.includes(false)
    } catch (err) {
      // sometimes node-rdkafka state not updated but already has `erroneous state` for fetching offsets/partitions
      this.log?.error({ err }, 'allMessagesRead error')
      if (!(err instanceof LibrdKafkaError && err.code === ERR__STATE)) {
        this.destroy(err)
      }
      return false
    }
  }

  /**
   * Determines whether we have outstanding acknowledgements to be written
   * to the broker
   */
  private hasOutstandingAcks(): boolean {
    const { offsetTracker, unacknowledgedTracker } = this

    for (const partition of Object.values(offsetTracker)) {
      if (partition == null) {
        continue
      }

      const trackerKey = KafkaConsumerStream.trackingKey(partition)
      const latestMessage = unacknowledgedTracker[trackerKey]
      if (latestMessage == null) {
        continue
      }

      // if we haven't consumed messages from wrapped stream,
      // but ack has already kicked in - we are not waiting for
      // acks yet
      if (latestMessage.offset == null) {
        continue
      }

      // 1. if we already have offsets in the latest message - need to wait for accks
      // 2. latest message offset must be smaller, or we need to wait for acks
      if (partition.offset == null || latestMessage.offset > partition.offset) {
        this.log?.debug({ offsetTracker, unacknowledgedTracker }, 'hasOutstandingAcks: true')
        return true
      }
    }

    this.log?.debug({ offsetTracker, unacknowledgedTracker }, 'hasOutstandingAcks: false')
    return false
  }

  /**
   * Gets consumer comitted partitions positions from broker
   */
  private async getPositions(assignments: TopicPartition[]): Promise<TopicPartition[]> {
    const commitedOffsets = await this.consumer.committedAsync(assignments, this.offsetQueryTimeout)
    for (const offset of commitedOffsets) {
      this.offsetTracker[KafkaConsumerStream.trackingKey(offset)] = offset
    }

    this.log?.debug({ commitedOffsets }, 'positions')
    return commitedOffsets
  }

  private updatePartitionOffsets(partitions: TopicPartition[], set: CommitOffsetTracker): void {
    for (const topicPartition of partitions) {
      const trackingKey = KafkaConsumerStream.trackingKey(topicPartition)
      const currentOffset = set[trackingKey]?.offset || -1001

      if (currentOffset < topicPartition.offset!) {
        set[KafkaConsumerStream.trackingKey(topicPartition)] = topicPartition
      }
    }
  }

  private cleanPartitionOffsets(partitions: TopicPartition[], set: CommitOffsetTracker): void {
    for (const topicPartition of partitions) {
      set[KafkaConsumerStream.trackingKey(topicPartition)] = undefined
    }
  }
}
