import * as assert from 'assert'
import { find } from 'lodash'
import { LoggerPlugin } from '@microfleet/core'

import {
  ConsumerStreamMessage, KafkaConsumer,
  KafkaConsumerStream as OriginalConsumerStream,
  TopicPartition
} from './rdkafka-extra'

import { ConsumerStreamOptions } from '@microfleet/plugin-kafka-types'

/**
 * Helps to read data from Kafka topic.
 * Allows to track consumer offset position and exit on EOF
 * Replaces `node-rdkafka/ConsumerStream`
 */
export class ConsumerStream extends OriginalConsumerStream {
  private static cacheKey = (topicPart:TopicPartition) => `${topicPart.topic}_${topicPart.partition}`

  public consumer!: KafkaConsumer
  private config: ConsumerStreamOptions
  private boundOnRead: (err: Error, messages: ConsumerStreamMessage[]) => void
  private autoStore: boolean
  private log?: LoggerPlugin['log']

  private positionCache: {
    [topicPartition: string]: TopicPartition
  }

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: KafkaConsumer, config: ConsumerStreamOptions, log?: LoggerPlugin['log']) {
    assert(consumer.isConnected(), 'consumer should be connected')

    const { offsetQueryTimeout, stopOnPartitionsEOF, ...rest } = config
    super(consumer, { ...rest, objectMode: true })

    this.autoStore = config['enable.auto.offset.store'] !== false
    this.boundOnRead = this.onRead.bind(this)
    this.config = config
    this.config.offsetQueryTimeout = config.offsetQueryTimeout || 300
    this.log = log
    this.positionCache = {}

    // reset position caches on rebalance
    this.consumer.on('rebalance', () => {
      this.positionCache = {}
    })
  }

  public connect(options: any) {
    // restore our read method
    this._read = this.overridenRead.bind(this)
    super.connect(options)
  }

  private async overridenRead(size: number): Promise<boolean | void> {
    const { config } = this
    const fetchSize = size! >= config.fetchSize! ? config.fetchSize : size!

    if (this.messages.length > 0) {
      const message = this.messages.shift()!
      this.push(message)
      this.offsetsStore(message)
    }

    if (this.destroyed) return

    if (config.stopOnPartitionsEOF === true) {
      if (await this.allMessagesRead()) {
        process.nextTick(() => {
          this.push(null)
        })
        return
      }
      this.consumer.consume(fetchSize!, this.boundOnRead)
    } else {
      this.consumer.consume(fetchSize!, this.boundOnRead)
    }
  }

  /**
   * Detects EOF of consumed topic partitions
   */
  private async allMessagesRead(): Promise<boolean> {
    const { consumer } = this
    const assignments = consumer.assignments()

    // skip check if no assignments received
    if (assignments.length === 0) {
      return false
    }

    const localPositions = await this.getPositions(assignments)

    const localOffsets = assignments.map(
      (assignment: TopicPartition) => ({
        ...{
          topic: assignment.topic,
          partition: assignment.partition,
        },
        ...consumer.getWatermarkOffsets(assignment.topic, assignment.partition),
      })
    )

    const partitionStatus = localOffsets.map((offsetInfo: any) => {
      const { highOffset, topic, partition } = offsetInfo
      const localPosition = find(localPositions, { topic, partition })
      return localPosition ? highOffset === localPosition.offset : false
    })
    this.log?.debug({ localPositions, localOffsets, partitionStatus })
    return !partitionStatus.includes(false)
  }

  /**
   * Gets consumer assigned partitions positions from local cache
   * If no position available, queries Broker and stores for further reuse
   */
  private async getPositions(assignments: TopicPartition[]): Promise<TopicPartition[]> {
    const missing = []
    const final = []
    const localPositions: TopicPartition[] = this.consumer.position(assignments)

    for (const position of localPositions) {
      if (position.offset) {
        final.push(position)
        continue
      }

      if (this.positionCache[ConsumerStream.cacheKey(position)]) {
        final.push(this.positionCache[ConsumerStream.cacheKey(position)])
        continue
      }

      missing.push(position)
    }

    if (missing.length > 0) {
      const commitedOffsets = await this.consumer.committedAsync(missing, this.config.offsetQueryTimeout)
      for (const offset of commitedOffsets) {
        this.positionCache[ConsumerStream.cacheKey(offset)] = offset
        final.push(offset)
      }
    }

    return final
  }

  private onRead(err: Error, messages: ConsumerStreamMessage[]) {
    if (err) this.destroy(err)

    if (err || messages.length < 1) {
      this.retry()
      return
    }

    if (this.config.streamAsBatch) {
      this.push(messages)
      this.offsetsStore(messages[messages.length - 1])
    } else {
      for (let i = 0; i < messages.length; i += 1) {
        this.messages.push(messages[i])
      }
      const firstMessage = this.messages.shift()!
      this.push(firstMessage)
      this.offsetsStore(firstMessage)
    }
  }

  private offsetsStore(message: ConsumerStreamMessage) {
    // Generally we should set offset as message.offset+1.
    // But we store offset in the same push and
    // if we use +1 notation next read operation will skip one offset.
    if (this.autoStore) {
      const topicPartition = {
        topic: message.topic,
        partition: message.partition,
        offset: message.offset,
      }
      this.consumer.offsetsStore([topicPartition])
    }
  }

  private retry() {
    const { waitInterval } = this.config

    if (!waitInterval) {
      setImmediate(() => {
        this._read(this.config.fetchSize!)
      })
    } else {
      setTimeout(
        () => {
          this._read(this.config.fetchSize!)
        },
        waitInterval! * Math.random()
      ).unref()
    }
  }
}
