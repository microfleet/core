import * as assert from 'assert'
import { find } from 'lodash'

import {
  ConsumerStreamMessage, KafkaConsumer,
  Client, KafkaConsumerStream as OriginalConsumerStream,
  TopicPartition
} from '../rdkafka-extra'

import { ConsumerStreamOptions } from '../types'

/**
 * Helps to read data from Kafka topic.
 * Allows to track consumer offset position and exit on EOF
 * Replaces `node-rdkafka/ConsumerStream`
 */
export class KafkaConsumerStream extends OriginalConsumerStream {
  private static cacheKey = (topicPart:TopicPartition) => `${topicPart.topic}_${topicPart.partition}`

  private consumer!: KafkaConsumer
  private config: ConsumerStreamOptions
  private boundOnRead: (err: Error, messages: ConsumerStreamMessage[]) => void

  private positionCache: {
    [topicPartition: string]: TopicPartition
  }

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  // @ts-ignore we strip some parameters
  constructor(consumer: Client, config: ConsumerStreamOptions) {
    assert(consumer.isConnected(), 'consumer should be connected')
    assert(consumer instanceof KafkaConsumer, 'should be intance of KafkaConsumer')

    const { offsetQueryTimeout, stopOnPartitionsEOF, ...rest } = config
    super(consumer, { ...rest, objectMode: true })

    this.config = config
    this.config.offsetQueryTimeout = config.offsetQueryTimeout || 300
    this.boundOnRead = this.onRead.bind(this)
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

  // tslint:disable-next-line
  private async overridenRead(size: number): Promise<boolean | void> {
    const { config } = this
    const fetchSize = size! >= config.fetchSize! ? config.fetchSize : size!

    if (this.messages.length > 0) {
      return this.push(this.messages.shift())
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

      if (this.positionCache[KafkaConsumerStream.cacheKey(position)]) {
        final.push(this.positionCache[KafkaConsumerStream.cacheKey(position)])
        continue
      }

      missing.push(position)
    }

    if (missing.length > 0) {
      const commitedOffsets = await this.consumer.committedAsync(missing, this.config.offsetQueryTimeout)
      for (const offset of commitedOffsets) {
        this.positionCache[KafkaConsumerStream.cacheKey(offset)] = offset
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
    } else {
      for (let i = 0; i < messages.length; i += 1) {
        this.messages.push(messages[i])
      }
      this.push(this.messages.shift())
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
