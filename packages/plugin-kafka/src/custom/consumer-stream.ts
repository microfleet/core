import { Readable } from 'readable-stream'
import * as assert from 'assert'
import { once } from 'events'
import { find } from 'lodash'
import { map, resolve, race, promisify, TimeoutError, delay,  } from 'bluebird'
import { helpers as ErrorHelpers } from 'common-errors'

import { LoggerPlugin } from '@microfleet/core'

import {
  KafkaConsumer, ConsumerStreamMessage,
  TopicPartition, CODES as KafkaCodes
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
} = KafkaErrorCodes

export type KafkaError = Error & {
  code: number
}

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

    this.offsetQueryTimeout = config.offsetQueryTimeout || 200
    this.offsetTracker = Object.create(null)
    this.unacknowledgedTracker = Object.create(null)
    this.consumer = consumer as KafkaConsumer
    this.autoStore = config['enable.auto.offset.store'] !== false

    this.messages = []

    this.consumer.on('rebalance', this.handleRebalance.bind(this))
    this.consumer.on('offset.commit', this.handleOffsetCommit.bind(this))
    this.on('buffer.drain', async () => {
      this.log?.debug('drain +ack')
      await this.checkEof()
    })

    const topics = Array.isArray(config.topics) ? config.topics! : [config.topics!]
    this.consumer.subscribe(topics)

  }

  public async _read(): Promise<void> {
    if (this.messages.length > 0) {
      this.log?.debug('BUFFER READ', this.messages.length)
      const message = this.messages.shift()!
      this.push(message)
      return
    }

    if (! this.readStarted) {
      this.log?.debug('FIRST READ START')
      this.readStarted = true
      this.readLoop()
      return
    }

    if (this.messages.length === 0) {
      this.log?.debug('emit buffer drain')
      this.resume()
      this.emit('buffer.drain')
    }
  }

  public _destroy(err: Error | null | undefined, callback?: (err: Error | null) => void): void {
    this.log?.debug('_destroy close consumer stream')
    // invalidate assignments otherwise rebalance_cb will be called later
    // and block some rdkafka threads
    this.consumer.assign([])
    this.consumer.disconnect(() => {
      if (callback) callback(err || null)
    })
  }

  public destroy(err?: Error | undefined, callback?: ((error: Error | null) => void) | undefined): this {
    const superDestroy = (_?: any) => {
      this.log?.debug({ err }, 'superDestroy')
      super.destroy(err)
    }

    this.once('close', () => {
      if (callback) callback(err || null)
    })

    if (this.destroying) {
      this.log?.debug({ err, callback }, 'in destroying state')
      return this
    }

    this.destroying = true

    if (err) {
      // invalidate ack waits
      this.consuming = false
      this.emit(EVENT_DESTROYING)
    }

    if (this.consuming) {
      resolve(once(this, EVENT_CONSUMED))
        .timeout(40000, 'offset commit timeout on shutdown')
        .then(() => {
          this.log?.debug('destroy - event received destroying')
          superDestroy()
        })
        .catch((timeoutError: TimeoutError) => {
          this.log?.debug({ timeoutError }, 'destroy - promise error')
          super.destroy(timeoutError)
        })
    } else {
      process.nextTick(() => {
        superDestroy()
      })
    }

    return this
  }

  public close(cb?: (err?: Error | null) => void): void {
    this.destroy(undefined, (err) => {
      if (cb) cb(err)
    })
  }

  async closeAsync(): Promise<void> {
    await promisify(this.close, { context: this })()
  }

  private handleOffsetCommit (err: Error, partitions: TopicPartition[]) {
    this.log?.info({ err, partitions }, 'offset.commit')
    if (err) {
      const wrappedError = new OffsetCommitError(partitions, err)
      this.emit(EVENT_OFFSET_COMMIT_ERROR, wrappedError)

      // Should be Error but current node-rdkafka version returns error code as number
      const code = typeof err === 'number' ? err : (err as KafkaError).code

      if (CriticalErrors.includes(code)) {
        this.log?.error({ err: wrappedError }, 'critical commit error')
        this.emit('error', wrappedError)
      }

      return
    }

    this.updatePartitionOffsets(partitions, this.offsetTracker)

    // once all acks were processed - be done with it
    if (!this.hasOutstandingAcks()) {
      this.log?.info('commit +ack')
      this.emit(EVENT_ACK)
    }
  }

  private async handleRebalance (err: KafkaError, assignments: TopicPartition[] = []) {
    this.log?.info({ err, assignments }, 'rebalance')
    process.nextTick(async () => {
      switch (err.code) {
        case ERR__ASSIGN_PARTITIONS:
          this.updatePartitionOffsets(assignments, this.offsetTracker)
          await this.checkEof()
          break

        case ERR__REVOKE_PARTITIONS:
          this.cleanPartitionOffsets(assignments, this.offsetTracker)
          this.cleanPartitionOffsets(assignments, this.unacknowledgedTracker)
          break

        default:
          this.emit('rebalance.error', err)
          return
      }
    })
  }

  private handleIncomingMessages(messages: ConsumerStreamMessage[]): void {
    const { unacknowledgedTracker, offsetTracker, autoStore } = this

    this.consumer.pause(this.consumer.assignments())

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

  private async ackedOrDestroyed(): Promise<Boolean> {
    return race([
      resolve(once(this, EVENT_ACK))
        .tap(() => { this.log?.debug('acked: with ACK event') })
        .return(true),
      resolve(once(this, EVENT_DESTROYING))
        .tap(() => { this.log?.debug('acked: with DESTROYING event') })
        .return(false),
    ])
  }

  // we must loop forever
  private async readLoop(): Promise<void> {
    if (this.destroyed) return

    const bufferAvailable = this._readableState.highWaterMark - this._readableState.length
    const fetchSize = this.config.streamAsBatch ? this.config.fetchSize! : bufferAvailable

    this.log?.debug(
      {
        watermark: this._readableState.highWaterMark,
        length: this._readableState.length,
        messages: this.messages.length,
      },
      `CONSUME... ${fetchSize}`
    )

    const messages = await this.consumer
      .consumeAsync(fetchSize)
      .catch((e) => {
        this.log?.error({ err: e }, 'consume error')
        this.emit('error', e)
      })

    if (messages && messages.length > 0) {
      this.handleIncomingMessages(messages)
    }

    if (this.config.waitInterval) await delay(this.config.waitInterval)
    this.readLoop()
  }

  private async checkEof(): Promise<void> {
    try {
      this.log?.debug('checking eof')

      if (this.hasOutstandingAcks()) {
        this.log?.debug('wait for +ack')
        await once(this, EVENT_ACK)
      }

      const eof = await this.allMessagesRead()
      this.log?.debug({ eof }, 'eof return')

      if (eof) {
        await this.closeAsync()
        this.log?.debug('eof reached - closed')
      } else {
        if (this.destroying) return
        this.log?.debug('eof not reached - resuming fetch')
        this.consumer.resume(this.consumer.assignments())
      }

      this.log?.debug('no eof - consuming')
    } catch (err) {
      this.log?.error({ err }, 'fatal err - destroying stream')
      this.destroy(err)
    }
  }

  /**
   * Detects EOF of consumed topic partitions
   * @param operationTimeout KafkaClient.committed and KafkaClient.queryWatermarkOffsets timeout
   */
  private async allMessagesRead(): Promise<boolean> {
    const { consumer, destroyed } = this

    // to avoid chain-calls when we are done
    if (destroyed) {
      this.log?.debug('destroyed')
      return true
    }

    const assignments: TopicPartition[] = consumer.assignments()

    // consumer didn't received assignment
    // this happens when consumer count greater than partition count
    // or Kafka rebalance in progress
    if (assignments.length === 0) {
      this.log?.debug('no assignments')
      // jump out of here is stream is destroying
      // assignments or other could be unavailable here
      if (!await this.ackedOrDestroyed()) {
        this.log?.debug('RECEIVED DESTROYING EVENT')
        return true
      }

      return this.allMessagesRead()
    }

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
      return localPosition ? highOffset === localPosition.offset : false
    })

    this.log?.debug({ assignments, localPositions, remoteOffsets, partitionStatus }, 'verifying positions')

    return !partitionStatus.includes(false)
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
