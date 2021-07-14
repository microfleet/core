import { Readable } from 'stream'
import * as assert from 'assert'
import { once } from 'events'
import { uniqWith, isEqual } from 'lodash'
import { promisify, delay } from 'bluebird'
import type { Logger } from '@microfleet/plugin-logger'
import type { ConsumerStreamOptions } from '@microfleet/plugin-kafka-types'
import { KafkaConsumer, Message, LibrdKafkaError } from './rdkafka-extra'
import { OffsetCommitError, CriticalErrors, RetryableErrors, UncommittedOffsetsError, Generic /*, CommitTimeoutError*/ } from './errors'
import { TopicPartitionOffset, SubscribeTopicList, Assignment, EofEvent } from 'node-rdkafka'

export type CommitOffsetTracker = Map<string, TopicPartitionOffset>
export const EVENT_OFFSET_COMMIT_ERROR = 'offset.commit.error'

const isTopicPartitionOffset = (obj: any): obj is TopicPartitionOffset => {
  return obj !== null && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'offset')
}

export const UNKNOWN_OFFSET = -1001
export type OffsetCommitErrorHandler = (err: OffsetCommitError) => boolean

type CommitOffsetTrackerObject = Record<string, TopicPartitionOffset>

export type TrackerMeta = {
  offsetTracker: CommitOffsetTrackerObject,
  unacknowledgedTracker: CommitOffsetTrackerObject,
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
  // private offsetCommitTimeout: number
  private offsetTracker: CommitOffsetTracker
  private unacknowledgedTracker: CommitOffsetTracker
  private partitionEofs: CommitOffsetTracker

  private log?: Logger
  private endEmitted: boolean

  private topics: SubscribeTopicList
  private messages: (Message | Message[])[]
  private autoStore: boolean
  private readStarted: boolean
  private hasError: boolean
  private externalOffsetCommitErrorHandler: OffsetCommitErrorHandler

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: KafkaConsumer, config: ConsumerStreamOptions, log?: Logger) {
    assert(consumer.isConnected(), 'consumer should be connected')
    assert(consumer instanceof KafkaConsumer, 'should be intance of KafkaConsumer')
    const fetchSize = config.fetchSize || 1
    const highWaterMark = config.streamAsBatch ? 1 : fetchSize

    super({ highWaterMark, objectMode: true, emitClose: true })

    if (log) this.log = log.child({ topic: config.topics })

    this.config = config
    this.readStarted = false
    this.endEmitted = false
    this.hasError = false
    this.fetchSize = fetchSize

    this.offsetQueryTimeout = config.offsetQueryTimeout || 200
    // this.offsetCommitTimeout = config.offsetCommitTimeout || 5000
    this.offsetTracker = new Map()
    this.unacknowledgedTracker = new Map()
    this.partitionEofs = new Map()

    this.consumer = consumer
    this.autoStore = config.autoOffsetStore !== false

    this.messages = []
    this.closeAsync = promisify(this.close, { context: this })

    this.handleRebalance = this.handleRebalance.bind(this)
    this.handleOffsetCommit = this.handleOffsetCommit.bind(this)
    this.externalOffsetCommitErrorHandler = () => true
    this.handleDisconnected = this.handleDisconnected.bind(this)
    this.handleUnsubscribed = this.handleUnsubscribed.bind(this)
    this.handleEOF = this.handleEOF.bind(this)

    this.consumer.on('rebalance', this.handleRebalance)
    this.consumer.on('offset.commit', this.handleOffsetCommit)
    this.consumer.on('disconnected', this.handleDisconnected)
    this.consumer.on('partition.eof', this.handleEOF)

    // we should start graceful shutdown on unsubscribe
    // otherwise stream could misbehave
    this.consumer.on('unsubscribed', this.handleUnsubscribed)

    this.topics = Array.isArray(config.topics) ? config.topics : [config.topics]

    // to avoid some race conditions in rebalance during parallel consumer connection
    // we should start subscription earlier than read started
    this.consumer.subscribe(this.topics)

    this.once('end', () => {
      this.endEmitted = true
    })
  }

  /**
   * Commit locally stored or provided offsets
   * @param offsets Offsets to commit
   */
  public commit(offsets: TopicPartitionOffset[] = [...this.unacknowledgedTracker.values()]): void {
    this.consumer.commit(offsets)
  }

  /**
   * Waits for commits to come through
   * @param offsets
   */
  public async commitMessages(messages: Message[]): Promise<void> {
    const offsets: TopicPartitionOffset[] = messages.map(m => ({
      topic: m.topic,
      partition: m.partition,
      offset: m.offset + 1,
    }))

    this.commit(offsets)
    this.log?.debug({ offsets }, 'commitAsync: pre')
    while (offsets.length > 0 && ! this.consumerDisconnected()) {
      const [err, positions] = await once(this.consumer, 'offset.commit') as [LibrdKafkaError | null, TopicPartitionOffset[]]
      this.log?.debug({ positions }, 'commitAsync: received')
      if (err) {
        if (!RetryableErrors.includes(err.code)) {
          throw err
        }
        return
      }

      for (const position of positions) {
        const commitedOffset = offsets.findIndex(x => x.offset === position.offset)
        if (commitedOffset !== -1) {
          offsets.splice(commitedOffset, 1)
        }
      }
    }
  }

  /**
   * Allows to setup custom offset commit error handler. If function returns true - Stream will throw and exit
   * @param handler Handler that executed when offset commit error received
   */
  public setOnCommitErrorHandler(handler: OffsetCommitErrorHandler): void {
    this.externalOffsetCommitErrorHandler = handler
  }

  public get trackerMeta(): TrackerMeta {
    return {
      offsetTracker: Object.fromEntries(this.offsetTracker),
      unacknowledgedTracker: Object.fromEntries(this.unacknowledgedTracker),
    }
  }

  public _read(): void {
    this.log?.debug('read')

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
    const next = () => {
      if (callback) callback(err || null)
    }

    if (this.consumerDisconnected()) {
      next()
      return
    }

    this.consumer.disconnect(next)
  }

  public close(cb?: (err?: Error | null, result?: any) => void): void {
    this.consumer.disconnect()

    if (this.endEmitted || !this.consumer.isConnected()) {
      if (cb) cb()
      return
    }

    this.on('error', (err) => {
      if (cb) cb(err)
    })

    this.on('close', () => {
      if (cb) cb()
    })
  }

  private inDestroyingState(): boolean {
    return this.consumerDisconnected()
  }

  private consumerDisconnected(): boolean {
    return this.consumer._isDisconnecting || !this.consumer.isConnected()
  }

  private handleUnsubscribed(): void {
    this.log?.debug('unsubscribed from topics - quitting')
    this.close()
  }

  private async handleEOF(eof: EofEvent): Promise<void> {
    // so that we can ensure that this is an eof event
    eof.eof = true

    this.log?.info({ eof }, 'eof event')
    await this.updatePartitionEof(eof, this.partitionEofs)
  }

  private async handleOffsetCommit(err: LibrdKafkaError | null | undefined , partitions: TopicPartitionOffset[]): Promise<void> {
    if (err) {
      const wrappedError = new OffsetCommitError(partitions, this.trackerMeta, err)

      this.log?.warn({ err: wrappedError }, '[commit] offset commit error')

      if (RetryableErrors.includes(err.code) && !this.consumerDisconnected()) {
        this.log?.info({ err, partitions }, '[commit] retry offset commit')
        this.consumer.commit(partitions)
        return
      }

      const isCritical = CriticalErrors.includes(err.code)
      const handlerResult = this.externalOffsetCommitErrorHandler(wrappedError)

      if (handlerResult || isCritical) {
        this.log?.error({ err: wrappedError }, '[commit] critical commit error')
        this.destroy(wrappedError)
        return
      }
    }

    if (this.endEmitted) {
      this.log?.debug('end emitted, not handling')
      return
    }

    if (!err) {
      this.updatePartitionOffsets(partitions, this.offsetTracker)
    }

    if (!this.hasOutstandingAcks()) {
      await this.checkEof()
    }
  }

  private handleDisconnected(): void {
    this.log?.info('handle disconnected')

    if (this.hasOutstandingAcks()) {
      this.destroy(
        new UncommittedOffsetsError(
          Object.fromEntries(this.offsetTracker.entries()),
          Object.fromEntries(this.unacknowledgedTracker.entries())
        )
      )
      return
    }

    if (!this.endEmitted && !this.hasError) {
      this.log?.debug('pushing end from handleDisconnected()')
      this.push(null)
    }

    this.destroy()
  }

  private async handleRebalance(err: LibrdKafkaError, assignments: Assignment[] = []) {
    this.log?.debug({ err, assignments }, 'rebalance')

    // IMPORTANT: assign/unassign executed by the library, we clean only local offsets registries
    // https://github.com/Blizzard/node-rdkafka/blob/4885043477f5e595a584edf6b37b93233d71bb7a/lib/kafka-consumer.js#L54

    switch (err.code) {
      case Generic.ERR__ASSIGN_PARTITIONS:
        // eslint-disable-next-line no-case-declarations
        const committedOffsets = await this.consumer.committedAsync(assignments, this.offsetQueryTimeout)
        this.log?.debug({ committedOffsets }, 'Check previous committed offsets')
        this.updatePartitionOffsets(committedOffsets, this.offsetTracker)
        break

      case Generic.ERR__REVOKE_PARTITIONS:
        if (!this.consumerDisconnected()) {
          this.cleanPartitionOffsets(assignments, this.offsetTracker)
          this.cleanPartitionOffsets(assignments, this.unacknowledgedTracker)
          this.cleanPartitionOffsets(assignments, this.partitionEofs)
        }
        break

      default:
        this.emit('rebalance.error', err)
        return
    }
  }

  private handleIncomingMessages(messages: Message[]): void {
    const { unacknowledgedTracker, autoStore } = this

    if (!this.consumerDisconnected()) {
      this.consumer.pause(this.consumer.assignments())
    }

    // Avoid duplicates. Sometimes node-rdkafka returns duplicate messages
    const uniqMessages = uniqWith(messages, isEqual)

    // Filter messages with offset lower than stored offset
    const exceptPreviousOffset = uniqMessages.filter((message) => {
      const trackingKey = KafkaConsumerStream.trackingKey(message)
      const storedOffset = this.unacknowledgedTracker.get(trackingKey)?.offset || UNKNOWN_OFFSET
      return storedOffset <= message.offset
    })

    if (uniqMessages.length != messages.length) {
      this.log?.warn({ uniqLength: uniqMessages.length, origLength: messages.length }, '[dup] Duplicates received')
    }

    if (exceptPreviousOffset.length != uniqMessages.length) {
      this.log?.warn({ filtered: exceptPreviousOffset.length, uniqMessages: uniqMessages.length }, '[dup] Previous offset data received')
    }

    for (const message of uniqMessages) {
      const topicPartition: TopicPartitionOffset = {
        topic: message.topic,
        partition: message.partition,
        offset: message.offset + 1,
      }

      this.updatePartitionOffsets([topicPartition], unacknowledgedTracker)
    }

    this.log?.debug({ autoStore, offsets: [...unacknowledgedTracker.values()] }, 'Before offset store')

    // We already have all max offsets inside unacknowledgedTracker. Let's mark them for commit
    if (autoStore && !this.consumerDisconnected()) this.consumer.offsetsStore([...unacknowledgedTracker.values()])

    if (this.config.streamAsBatch) {
      this.messages.push(exceptPreviousOffset)
    } else {
      this.messages.push(...exceptPreviousOffset)
    }

    // transfer messages from local buffer to the stream buffer
    this._read()
  }

  // we must loop forever
  private async readLoop(): Promise<void> {
    while (!this.consumerDisconnected() && !this.endEmitted) {
      // when consumer disconnecting it throws Error: KafkaConsumer is not connected
      const bufferAvailable = this.readableHighWaterMark - this.readableLength
      const fetchSize = this.config.streamAsBatch ? this.fetchSize : bufferAvailable

      try {
        this.log?.debug('read loop messages queued')
        const messages = await this.consumer.consumeAsync(fetchSize)
        this.log?.debug('read loop messages returned: %d', messages.length)

        if (messages.length > 0) this.handleIncomingMessages(messages)
        if (this.config.waitInterval) await delay(this.config.waitInterval)
      } catch (err) {
        this.log?.error({ err }, 'consume error')
        // We can receive Broker transport error with code -1
        // It's repeatable error
        if (err.code !== Generic.ERR_UNKNOWN) {
          this.destroy(err)
          return
        }
      }
    }

    this.readStarted = false
  }

  private async checkEof(): Promise<void> {
    if (this.inDestroyingState() || !this.config.stopOnPartitionsEOF) {
      this.log?.debug('checkEof: destroying')
      return
    }

    // we must wrap all asynchronous operations
    // because consumer state could be changed while we are waiting for promises
    try {
      let eofReached = true
      for (const val of this.offsetTracker.values()) {
        if (!val.eof) {
          eofReached = false
          break
        }
      }

      if (eofReached) {
        this.log?.debug('eof reached')
        await this.closeAsync()
        return
      }
    } catch (err) {
      this.log?.error({ err }, 'check eof error')

      if (err.code !== Generic.ERR__STATE || !this.inDestroyingState()) {
        this.destroy(err)
        return
      }
    }

    if (!this.inDestroyingState()) {
      this.consumer.resume(this.consumer.assignments())
    }
  }

  /**
   * Determines whether we have outstanding acknowledgements to be written
   * to the broker
   */
  private hasOutstandingAcks(): boolean {
    const { offsetTracker, unacknowledgedTracker } = this

    for (const partition of offsetTracker.values()) {
      const trackerKey = KafkaConsumerStream.trackingKey(partition)
      const latestMessage = unacknowledgedTracker.get(trackerKey)
      if (!latestMessage) {
        continue
      }

      // 1. if we already have offsets in the latest message - need to wait for accks
      // 2. latest message offset must be smaller, or we need to wait for acks
      if (latestMessage.offset > partition.offset) {
        this.log?.debug(this.trackerMeta, 'hasOutstandingAcks: true')
        return true
      }
    }

    this.log?.debug(this.trackerMeta, 'hasOutstandingAcks: false')
    return false
  }

  private async updatePartitionEof(topicPartition: TopicPartitionOffset, map: CommitOffsetTracker): Promise<void> {
      const trackingKey = KafkaConsumerStream.trackingKey(topicPartition)

      map.set(trackingKey, topicPartition)

      const currentOffsetData = this.offsetTracker.get(trackingKey)
      const currentOffset = currentOffsetData?.offset || UNKNOWN_OFFSET

      if (
        currentOffsetData && (
          currentOffset === topicPartition.offset || currentOffset === UNKNOWN_OFFSET
        )
      ) {
        currentOffsetData.eof = true
      }

      if (!this.hasOutstandingAcks()) {
        await this.checkEof()
      }
  }

  private updatePartitionOffsets(partitions: Assignment[], map: CommitOffsetTracker): void {
    for (const topicPartition of partitions) {
      const trackingKey = KafkaConsumerStream.trackingKey(topicPartition)

      // if it has offset - verify that the current offset is smaller
      if (isTopicPartitionOffset(topicPartition)) {
        const currentOffsetData = map.get(trackingKey)
        const currentOffset = currentOffsetData?.offset || UNKNOWN_OFFSET

        if (currentOffset <= topicPartition.offset || !currentOffsetData) {
          map.set(KafkaConsumerStream.trackingKey(topicPartition), topicPartition)
        }
      // if it has no offset - means its a new assignment, set offset to -1001
      } else if (!map.has(trackingKey)) {
        map.set(KafkaConsumerStream.trackingKey(topicPartition), {
          topic: topicPartition.topic,
          partition: topicPartition.partition,
          offset: UNKNOWN_OFFSET
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

export interface KafkaConsumerStream extends Readable {
  closeAsync(): PromiseLike<void>;
}
