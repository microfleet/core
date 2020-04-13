import { Readable } from 'readable-stream'
import * as assert from 'assert'
import { once } from 'events'
import { find } from 'lodash'
import { map, promisify, delay } from 'bluebird'
import type { Logger } from '@microfleet/plugin-logger'
import type { ConsumerStreamOptions } from '@microfleet/plugin-kafka-types'
import { KafkaConsumer, Message, TopicPartition, LibrdKafkaError } from './rdkafka-extra'
import { OffsetCommitError, CriticalErrors, UncommittedOffsetsError, Generic, CommitTimeoutError } from './errors'
import { TopicPartitionOffset, SubscribeTopicList, Assignment } from 'node-rdkafka'

export type CommitOffsetTracker = Map<string, TopicPartitionOffset>
export const EVENT_CONSUMED = 'consumed'
export const EVENT_OFFSET_COMMIT_ERROR = 'offset.commit.error'

const isTopicPartitionOffset = (obj: any): obj is TopicPartitionOffset => {
  return obj !== null && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'offset')
}

/**
 * Helps to read data from Kafka topic.
 * Allows to track consumer offset position and exit on EOF
 * Replaces `node-rdkafka/ConsumerStream`
 */
export class KafkaConsumerStream extends Readable {
  private static trackingKey(topicPart: Assignment): string {
    return `${topicPart.topic}_${topicPart.partition}`
  }

  public consumer: KafkaConsumer
  private config: ConsumerStreamOptions
  private fetchSize: number
  private offsetQueryTimeout: number
  private offsetCommitTimeout: number
  private offsetTracker: CommitOffsetTracker
  private unacknowledgedTracker: CommitOffsetTracker
  private log?: Logger

  private topics: SubscribeTopicList
  private messages: (Message | Message[])[]
  private consuming: boolean
  private destroying: boolean
  private autoStore: boolean
  private readStarted: boolean
  private hasError: boolean
  private subscribed: boolean

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: KafkaConsumer, config: ConsumerStreamOptions, log?: Logger) {
    assert(consumer.isConnected(), 'consumer should be connected')
    assert(consumer instanceof KafkaConsumer, 'should be intance of KafkaConsumer')
    const fetchSize = config.fetchSize || 1
    const highWaterMark = config.streamAsBatch ? 1 : fetchSize

    super({ highWaterMark, objectMode: true })

    this.log = log
    this.config = config
    this.consuming = false
    this.destroying = false
    this.readStarted = false
    this.hasError = false
    this.fetchSize = fetchSize

    this.offsetQueryTimeout = config.offsetQueryTimeout || 200
    this.offsetCommitTimeout = config.offsetCommitTimeout || 5000
    this.offsetTracker = new Map()
    this.unacknowledgedTracker = new Map()
    this.consumer = consumer as KafkaConsumer
    this.autoStore = config.autoOffsetStore !== false
    this.subscribed = false

    this.messages = []
    this.closeAsync = promisify(this.close, { context: this })

    this.consumer.on('rebalance', this.handleRebalance.bind(this))
    this.consumer.on('offset.commit', this.handleOffsetCommit.bind(this))
    this.consumer.on('disconnected', this.handleDisconnected.bind(this))

    this.topics = Array.isArray(config.topics) ? config.topics : [config.topics]
  }

  public async _read(): Promise<void> {
    if (!this.subscribed) {
      this.consumer.subscribe(this.topics)
      this.subscribed = true
    }

    if (this.messages.length > 0) {
      const message = this.messages.shift()
      this.push(message)
      return
    }

    if (!this.readStarted) {
      this.readStarted = true
      this.readLoop()
      return
    }
  }

  public _destroy(err: Error | null | undefined, callback?: (err: Error | null) => void): void {
    if (!this.consumer.isConnected()) {
      if (callback) callback(err || null)
      return
    }

    this.consumer.disconnect(() => {
      if (!this._readableState.endEmitted && !this.hasError) {
        this.push(null)
      }
      if (callback) callback(err || null)
    })
  }

  public destroy(err?: Error | undefined, callback?: ((error: Error | null) => void) | undefined): this {
    if (this.destroyed) {
      if (callback) callback(err || null)
      return this
    }

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
      (async () => {
        try {
          await Promise.race([
            once(this, EVENT_CONSUMED),
            delay(this.offsetCommitTimeout).throw(CommitTimeoutError),
          ])

          super.destroy(err, callback)
        } catch (timeoutError) {
          super.destroy(timeoutError, callback)
        }
      })()
    } else {
      setImmediate(() => {
        super.destroy(err, callback)
      })
    }

    return this
  }

  public close(cb?: (err?: Error | null, result?: any) => void): void {
    this.destroy(undefined, cb)
  }

  private inDestroyingState(): boolean {
    return this.consumerDisconnected() || this.destroying
  }

  private consumerDisconnected(): boolean {
    return this.consumer._isDisconnecting || !this.consumer.isConnected()
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

  private async handleRebalance(err: LibrdKafkaError, assignments: Assignment[] = []) {
    process.nextTick(async () => {
      switch (err.code) {
        case Generic.ERR__ASSIGN_PARTITIONS:
          this.updatePartitionOffsets(assignments, this.offsetTracker)
          // early exit if all topics partitions read and offsets maxed
          await this.checkEof()
          break

        case Generic.ERR__REVOKE_PARTITIONS:
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

    if (!this.consumerDisconnected()) {
      this.consumer.pause(this.consumer.assignments())
    }

    for (const message of messages) {
      const topicPartition: TopicPartitionOffset = {
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

    const bufferAvailable = this.readableHighWaterMark - this.readableLength
    const fetchSize = this.config.streamAsBatch ? this.fetchSize : bufferAvailable

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
    if (this.inDestroyingState() || !this.config.stopOnPartitionsEOF) return

    // we must wrap all asynchronous operations
    // because consumer state could be changed while we are waiting for promises
    try {
      const eof = await this.allMessagesRead()

      if (eof) {
        this.push(null)
        return
      }
    } catch (err) {
      this.log?.error({ err }, 'check eof error')

      if (err.code !== Generic.ERR__STATE || !this.inDestroyingState()) {
        this.destroy(err)
      }
    }

    if (! this.inDestroyingState()) {
      this.consumer.resume(this.consumer.assignments())
    }
  }

  /**
   * Detects EOF on consumed topic partitions
   */
  private async allMessagesRead(): Promise<boolean> {
    const { consumer } = this

    const assignments: TopicPartition[] = consumer.assignments()

    if (assignments.length === 0) {
      this.log?.warn('allMessagesRead no assignments')
      return true
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
      const localPosition = find(localPositions, { topic, partition })

      if (!localPosition) return false

      const localOffset = localPosition.offset || 0

      return localPosition ? highOffset === localOffset : false
    })

    return !partitionStatus.includes(false)
  }

  /**
   * Determines whether we have outstanding acknowledgements to be written
   * to the broker
   */
  private hasOutstandingAcks(): boolean {
    const { offsetTracker, unacknowledgedTracker } = this

    for (const partition of offsetTracker.values()) {
      if (partition == null) {
        continue
      }

      const trackerKey = KafkaConsumerStream.trackingKey(partition)
      const latestMessage = unacknowledgedTracker.get(trackerKey)
      if (latestMessage == null) {
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
   * Gets consumer committed partitions positions from broker
   */
  private async getPositions(assignments: Assignment[]): Promise<TopicPartitionOffset[]> {
    const commitedOffsets = await this.consumer.committedAsync(assignments, this.offsetQueryTimeout)
    for (const offset of commitedOffsets) {
      this.offsetTracker.set(KafkaConsumerStream.trackingKey(offset), offset)
    }

    this.log?.debug({ commitedOffsets }, 'positions')
    return commitedOffsets
  }

  private updatePartitionOffsets(partitions: Assignment[], map: CommitOffsetTracker): void {
    for (const topicPartition of partitions) {
      const trackingKey = KafkaConsumerStream.trackingKey(topicPartition)
      const currentOffset = map.get(trackingKey)?.offset || -1001

      // if it has offset - verify that the current offset is smaller
      if (isTopicPartitionOffset(topicPartition)) {
        if (currentOffset < topicPartition.offset) {
          map.set(KafkaConsumerStream.trackingKey(topicPartition), topicPartition)
        }
      // if it has no offset - means its a new assignment, set offset to 0
      } else if (currentOffset < 0) {
        map.set(KafkaConsumerStream.trackingKey(topicPartition), {
          topic: topicPartition.topic,
          partition: topicPartition.partition,
          offset: 0
        })
      }
    }
  }

  private cleanPartitionOffsets(partitions: Assignment[], map: CommitOffsetTracker): void {
    for (const topicPartition of partitions) {
      map.delete(KafkaConsumerStream.trackingKey(topicPartition))
    }
  }
}

export interface KafkaConsumerStream {
  closeAsync(): PromiseLike<void>;
}
