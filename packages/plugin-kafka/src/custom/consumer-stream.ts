import { Readable } from 'readable-stream'
import * as assert from 'assert'
import { once } from 'events'
import { KafkaConsumer, KafkaConsumerStream, ConsumerStreamOptions, ConsumerStreamMessage } from './rdkafka-extra'
import { TopicPartition } from 'node-rdkafka'
import { find, pick } from 'lodash'

export interface CommitOffsetTracker {
  [topicNamePartition: string]: TopicPartition | null | undefined
}

/**
 * Helps to read data from Kafka topic.
 * Allows to track consumer offset position and exit on EOF
 * Replaces `node-rdkafka/ConsumerStream`
 */
export class ConsumerStream extends Readable {
  private static trackingKey(topicPart: TopicPartition): string {
    return `${topicPart.topic}_${topicPart.partition}`
  }

  public consumer: KafkaConsumer
  private consumerStream: typeof KafkaConsumerStream
  private offsetQueryTimeout: number
  private offsetTracker: CommitOffsetTracker
  private unacknowledgedTracker: CommitOffsetTracker

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: KafkaConsumer, config: ConsumerStreamOptions) {
    assert(consumer.isConnected(), 'consumer should be connected')
    assert(consumer instanceof KafkaConsumer, 'should be intance of KafkaConsumer')

    super({ objectMode: true, highWaterMark: (config.fetchSize || 0) + 2 })

    this.offsetQueryTimeout = config.offsetQueryTimeout || 200
    this.offsetTracker = Object.create(null)
    this.unacknowledgedTracker = Object.create(null)
    this.consumer = consumer as KafkaConsumer

    this.consumer.on('rebalance', (err: Error, assignments?: TopicPartition[]) => {
      console.info('rebalance', err, assignments)

      if (err) {
        this.emit('rebalance.error', err)
      }

      if (assignments) {
        this.offsetTracker = Object.create(null)
        this.updatePartitionOffsets(assignments, this.offsetTracker)
      }

      // TODO: could be wrong to verify here -- need tests
      if (!this.hasOutstandingAcks()) {
        this.emit('acknowledged')
      }
    })

    this.consumer.on('offset.commit', (err: Error, partitions: TopicPartition[]) => {
      console.info('offset.commit', err, partitions)

      if (err) {
        this.emit('offset.commit.error', err)
        return
      }

      this.updatePartitionOffsets(partitions, this.offsetTracker)

      // once all acks were processed - be done with it
      if (!this.hasOutstandingAcks()) {
        this.emit('acknowledged')
      }
    })

    this.consumerStream = new KafkaConsumerStream(consumer, {
      ...config,
      streamAsBatch: true,
    })

    this.consumerStream.on('error', (err) => {
      this.emit('error', err)
    })

    this.consumerStream.once('close', () => {
      this.push(null)
    })

    this.consumerStream.on('data', (messages: ConsumerStreamMessage[]) => {
      let needsToPause = false

      // records the last message to be received with its offset
      const topicPartition: TopicPartition = pick(messages[messages.length - 1], ['topic', 'partition', 'offset'])
      this.updatePartitionOffsets([topicPartition], this.unacknowledgedTracker)

      if (config.streamAsBatch) {
        needsToPause = !this.push(messages)
      } else {
        // push 1 by 1
        for (const message of messages) {
          if (!this.push(message)) {
            needsToPause = true
          }
        }
      }

      if (needsToPause) {
        this.consumerStream.pause()
      }
    })

    this.consumerStream.pause()
  }

  async _read(): Promise<void> {
    if (this.consumerStream.messages.length > 0) {
      this.consumerStream.resume()
      return
    }

    try {
      if (this.hasOutstandingAcks()) {
        await once(this, 'acknowledged')
      }

      const eof = await this.allMessagesRead()

      if (!eof) {
        this.consumerStream.resume()
        return
      }

      await this.closeAsync()
    } catch (e) {
      this.destroy(e)
    }
  }

  _destroy(err: Error | null | undefined, callback?: (err?: Error | undefined) => void): void {
    if (this.consumerStream.destroyed) {
      if (callback) process.nextTick(callback)
      return
    }

    this.consumerStream.destroy(err || undefined)
    if (callback) {
      this.consumerStream.once('close', () => callback())
    }
  }

  close(cb?: (err?: Error | null) => void): void {
    if (this.destroyed) {
      if (cb) process.nextTick(cb)
      return
    }

    this.destroy(undefined, cb)
  }

  async closeAsync(): Promise<void> {
    if (this.destroyed) {
      return
    }

    this.destroy()
    await once(this, 'close')
  }

  /**
   * Detects EOF of consumed topic partitions
   * @param operationTimeout KafkaClient.committed and KafkaClient.queryWatermarkOffsets timeout
   */
  public async allMessagesRead(): Promise<boolean> {
    const { consumer } = this
    const assignments = consumer.assignments()

    // consumer didn't received assignment
    // this happens when consumer count greater than partition count
    // or Kafka rebalance in progress
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

    console.info('local offsets: %j', localOffsets)

    const partitionStatus = localOffsets.map((offsetInfo: any) => {
      const { highOffset, topic, partition } = offsetInfo
      const localPosition = find(localPositions, { topic, partition })
      return localPosition ? highOffset === localPosition.offset : false
    })

    return !partitionStatus.includes(false)
  }

  /**
   * Determines whether we have outstanding acknowledgements to be written
   * to the broker
   */
  private hasOutstandingAcks(): boolean {
    for (const partition of Object.values(this.offsetTracker)) {
      if (partition == null) {
        continue
      }

      const trackerKey = ConsumerStream.trackingKey(partition)
      const latestMessage = this.unacknowledgedTracker[trackerKey]
      if (latestMessage == null) {
        continue
      }

      if (latestMessage.offset !== partition.offset) {
        console.info('verify outstanding acks %j vs %j', latestMessage, partition)
        return true
      }
    }

    return false
  }

  /**
   * Gets consumer assigned partitions positions from local cache
   * If no position available, queries Broker and stores for further reuse
   */
  private async getPositions(assignments: TopicPartition[]): Promise<TopicPartition[]> {
    const missing: TopicPartition[] = []
    const final: TopicPartition[] = []
    const localPositions: TopicPartition[] = this.consumer.position(assignments)

    for (const position of localPositions) {
      if (position.offset) {
        final.push(position)
        continue
      }

      const trackedPosition = this.offsetTracker[ConsumerStream.trackingKey(position)]
      if (trackedPosition != null) {
        final.push(trackedPosition)
        continue
      }

      missing.push(position)
    }

    if (missing.length > 0) {
      const commitedOffsets = await this.consumer.committedAsync(missing, this.offsetQueryTimeout)
      for (const offset of commitedOffsets) {
        this.offsetTracker[ConsumerStream.trackingKey(offset)] = offset
        final.push(offset)
      }
    }

    return final
  }

  private updatePartitionOffsets(partitions: TopicPartition[], set: CommitOffsetTracker): void {
    for (const topicPartition of partitions) {
      set[ConsumerStream.trackingKey(topicPartition)] = topicPartition
    }
  }
}
