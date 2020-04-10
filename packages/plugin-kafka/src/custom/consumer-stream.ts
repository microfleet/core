import { Readable } from 'readable-stream'
import * as assert from 'assert'
import { once } from 'events'
import { find } from 'lodash'
import {
  map, resolve, promisify, TimeoutError, delay,
} from 'bluebird'
import { helpers as ErrorHelpers, Error } from 'common-errors'

import { LoggerPlugin } from '@microfleet/plugin-logger'

import {
  KafkaConsumer, Message,
  TopicPartition, CODES as KafkaCodes,
  LibrdKafkaError,
} from './rdkafka-extra'

import { ConsumerStreamOptions } from '@microfleet/plugin-kafka-types'
import { TopicPartitionOffset } from 'node-rdkafka'

export interface CommitOffsetTracker {
  [topicNamePartition: string]: TopicPartitionOffset | null | undefined;
}

const { ERRORS: KafkaErrorCodes } = KafkaCodes
const {
  ERR__ASSIGN_PARTITIONS,
  ERR__REVOKE_PARTITIONS,
  ERR_UNKNOWN_MEMBER_ID,
  ERR_UNKNOWN_TOPIC_OR_PART,
  ERR__STATE,
} = KafkaErrorCodes

export const EVENT_CONSUMED = 'consumed'
export const EVENT_OFFSET_COMMIT_ERROR = 'offset.commit.error'

interface CommonError {
  inner_error: number | Error;
}

export const OffsetCommitError = ErrorHelpers.generateClass('OffsetCommitError', {
  args: ['partitions', 'inner_error'],
  generateMessage: function generateMessage(this: CommonError) {
    if (typeof this.inner_error === 'number') {
      return `Kafka critical error: ${this.inner_error}`
    }
    return `Kafka critical error: ${this.inner_error.message}`
  },
})

export const UncommittedOffsetsError = ErrorHelpers.generateClass('UncommittedOffsetsError', {
  args: ['offset_tracker', 'unacknowledged_tracker'],
  generateMessage: () => 'Uncomitted offsets left',
})

export const CriticalErrors: number[] = [
  ERR_UNKNOWN_MEMBER_ID,
  ERR_UNKNOWN_TOPIC_OR_PART,
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
  private offsetCommitTimeout: number
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
    this.offsetCommitTimeout = config.offsetCommitTimeout || 5000
    this.offsetTracker = Object.create(null)
    this.unacknowledgedTracker = Object.create(null)
    this.consumer = consumer as KafkaConsumer
    this.autoStore = config.autoOffsetStore !== false

    this.messages = []

    this.consumer.on('rebalance', this.handleRebalance.bind(this))
    this.consumer.on('offset.commit', this.handleOffsetCommit.bind(this))
    this.consumer.on('disconnected', this.handleDisconnected.bind(this))

    const topics = Array.isArray(config.topics) ? config.topics : [config.topics]
    this.consumer.subscribe(topics)
  }

  public async _read(): Promise<void> {
    if (this.messages.length > 0) {
      const message = this.messages.shift()
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
      if (callback) callback(err || null)
      return
    }

    // REMOVE?
    if (!this.inDestroyingState()) {
      this.consumer.assign([])
    }

    this.consumer.disconnect(() => {
      if (!this._readableState.endEmitted && !this.hasError) {
        this.push(null)
      }
      if (callback) callback(err || null)
    })
  }

  public destroy(err?: Error | undefined, callback?: ((error: Error | null) => void) | undefined): this {
    if (this.destroying) {
      this.once('close', () => {
        if (callback) callback(err || null)
      })
      return this
    }

    this.destroying = true

    if (err) {
      // invalidate ack waits
      this.hasError = true
      this.consuming = false
    }

    if (this.consuming) {
      resolve(once(this, EVENT_CONSUMED))
        .timeout(this.offsetCommitTimeout, 'offset commit timeout on shutdown')
        .then(() => {
          super.destroy(err, callback)
        })
        .catch((timeoutError: TimeoutError) => {
          super.destroy(timeoutError, callback)
        })
    } else {
      setImmediate(() => {
        super.destroy(err, callback)
      })
    }

    return this
  }

  public close(cb?: (err?: Error | null) => void): void {
    if (this.destroyed) {
      if (cb) cb()
      return
    }

    this.once('close', () => {
      if (cb) cb()
    })

    this.destroy()
  }

  async closeAsync(): Promise<void> {
    await promisify(this.close, { context: this })()
  }

  private inDestroyingState(): boolean {
    return this.consumerDisconnected() || this.destroying
  }

  private consumerDisconnected(): boolean {
    return this.consumer._isDisconnecting || !this.consumer.isConnected()
  }

  private pauseConsumer(): void {
    if (this.consumerDisconnected()) return
    this.consumer.pause(this.consumer.assignments())
  }

  private resumeConsumer(): void {
    if (this.consumerDisconnected()) return
    this.consumer.resume(this.consumer.assignments())
  }

  private async handleOffsetCommit(err: Error, partitions: TopicPartitionOffset[]): Promise<void> {
    if (err) {
      const wrappedError = new OffsetCommitError(partitions, err)
      this.emit(EVENT_OFFSET_COMMIT_ERROR, wrappedError)

      // Should be Error but current node-rdkafka version returns error code as number
      const code = typeof err === 'number' ? err : (err as LibrdKafkaError).code

      if (CriticalErrors.includes(code)) {
        this.log?.error({ err: wrappedError }, 'critical commit error')
        this.destroy(wrappedError)
      }

      return
    }

    this.updatePartitionOffsets(partitions, this.offsetTracker)

    // once all acks were processed - be done with it
    if (!this.hasOutstandingAcks()) {
      await this.checkEof()

      // notify that received chunk processed
      this.consuming = false
      this.emit(EVENT_CONSUMED)
      return
    }
  }

  private handleDisconnected(): void {
    if (this.destroying) return

    if (this.hasOutstandingAcks()) {
      this.destroy(new UncommittedOffsetsError(this.offsetTracker, this.unacknowledgedTracker))
      return
    }

    this.destroy()
  }

  private async handleRebalance (err: LibrdKafkaError, assignments: TopicPartition[] = []) {
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

  private handleIncomingMessages(messages: Message[]): void {
    const { unacknowledgedTracker, autoStore } = this

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
    }

    if (this.config.streamAsBatch) {
      this.messages.push(messages)
    } else {
      this.messages.push(...messages)
    }

    // transfer messages from local buffer to the stream buffer
    this._read()
  }

  // we must loop forever
  private async readLoop(): Promise<void> {
    // when consumer disconnecting it throws Error: KafkaConsumer is not connected
    if (this.consumerDisconnected()) return

    const bufferAvailable = this._readableState.highWaterMark - this._readableState.length
    const fetchSize = this.config.streamAsBatch ?
      this.config.fetchSize || 1
      : bufferAvailable

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
    if (this.inDestroyingState()) return

    try {
      const eof = await this.allMessagesRead()

      if (eof) {
        this.push(null)
        return
      }

      if (this.inDestroyingState()) return
      this.resumeConsumer()
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

    if (assignments.length === 0) {
      this.log?.error('allMessagesRead no assignments')
      return false
    }

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
        if (!localPosition) return false

        const localOffset = localPosition.offset || 0

        return localPosition ? highOffset === localOffset : false
      })

      return !partitionStatus.includes(false)
    } catch (err) {
      // sometimes node-rdkafka state not updated but already has `erroneous state` for fetching offsets/partitions
      this.log?.error({ err }, 'allMessagesRead error')
      if (!(err.code === ERR__STATE)) {
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
  private async getPositions(assignments: TopicPartition[]): Promise<TopicPartitionOffset[]> {
    const commitedOffsets = await this.consumer.committedAsync(assignments, this.offsetQueryTimeout)
    for (const offset of commitedOffsets) {
      this.offsetTracker[KafkaConsumerStream.trackingKey(offset)] = offset
    }

    this.log?.debug({ commitedOffsets }, 'positions')
    return commitedOffsets
  }

  private updatePartitionOffsets(partitions: TopicPartition[], set: CommitOffsetTracker): void {
    for (const topicPartition of partitions as TopicPartitionOffset[]) {
      const trackingKey = KafkaConsumerStream.trackingKey(topicPartition)
      const currentOffset = set[trackingKey]?.offset || -1001

      if (currentOffset < (topicPartition.offset || 0)) {
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
