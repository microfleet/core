import { Readable } from 'readable-stream'
import * as assert from 'assert'
import { once } from 'events'
import { KafkaConsumer, KafkaConsumerStream, ConsumerStreamOptions, ConsumerStreamMessage } from './rdkafka-extra'
import { TopicPartition, CODES as KafkaCodes } from 'node-rdkafka'
import { find } from 'lodash'
import { map } from 'bluebird'
import { LoggerPlugin } from '@microfleet/core'

export interface CommitOffsetTracker {
  [topicNamePartition: string]: TopicPartition | null | undefined
}

const { ERRORS: KafkaErrorCodes } = KafkaCodes
const { ERR__ASSIGN_PARTITIONS, ERR__REVOKE_PARTITIONS } = KafkaErrorCodes

export type KafkaError = Error & {
  code: number
}

export const EVENT_ACK = 'acknowledged'

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
  private log?: LoggerPlugin['log']
  private looping: boolean
  private autoStore: boolean

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: KafkaConsumer, config: ConsumerStreamOptions, log?: LoggerPlugin['log']) {
    assert(consumer.isConnected(), 'consumer should be connected')
    assert(consumer instanceof KafkaConsumer, 'should be intance of KafkaConsumer')

    super({ objectMode: true, highWaterMark: (config.fetchSize || 0) + 2 })

    this.log = log
    this.looping = false
    this.offsetQueryTimeout = config.offsetQueryTimeout || 200
    this.offsetTracker = Object.create(null)
    this.unacknowledgedTracker = Object.create(null)
    this.consumer = consumer as KafkaConsumer
    this.autoStore = config['enable.auto.offset.store'] !== false

    this.consumer.on('rebalance', (err: KafkaError, assignments: TopicPartition[] = []) => {
      // so that .assign / .unassign is triggered before we react to the event
      process.nextTick(() => {
        this.log?.info({ err, assignments }, 'rebalance')

        switch (err.code) {
          case ERR__ASSIGN_PARTITIONS:
            this.updatePartitionOffsets(assignments, this.offsetTracker)
            break

          case ERR__REVOKE_PARTITIONS:
            this.cleanPartitionOffsets(assignments, this.offsetTracker)
            this.cleanPartitionOffsets(assignments, this.unacknowledgedTracker)
            break

          default:
            this.emit('rebalance.error', err)
            return
        }

        if (!this.hasOutstandingAcks()) {
          this.log?.info('rebalance +ack')
          this.emit(EVENT_ACK)
        }
      })
    })

    this.consumer.on('offset.commit', (err: Error, partitions: TopicPartition[]) => {
      this.log?.debug({ err, partitions }, 'offset.commit')

      if (err) {
        this.log?.warn({ err }, 'commit error')
        this.emit('offset.commit.error', err)
        return
      }

      this.updatePartitionOffsets(partitions, this.offsetTracker)

      // once all acks were processed - be done with it
      if (!this.hasOutstandingAcks()) {
        this.log?.info('commit +ack')
        this.emit(EVENT_ACK)
      }
    })

    this.consumerStream = new KafkaConsumerStream(consumer, {
      ...config,
      streamAsBatch: true,
    })

    this.consumerStream.on('error', (err) => {
      this.log?.debug({ err }, 'consumerStream error')
      this.emit('error', err)
    })

    // NOTE: end vs close?
    this.consumerStream.once('close', () => {
      this.log?.debug('received close: closing stream')
      this.push(null)
    })

    this.consumerStream.consumer.on('data', (message: ConsumerStreamMessage) => {
      this.log?.debug({ message }, 'low-level message')
    })

    const { streamAsBatch } = config
    this.consumerStream.on('data', (messages: ConsumerStreamMessage[]) => {
      let needsToPause = false
      const { unacknowledgedTracker, offsetTracker, autoStore } = this

      for (const message of messages) {
        const topicPartition = {
          topic: message.topic,
          partition: message.partition,
          offset: message.offset + 1,
        }

        this.updatePartitionOffsets([topicPartition], unacknowledgedTracker)

        if (autoStore) {
          consumer.offsetsStore([topicPartition])
        }

        if (!streamAsBatch) {
          if (!this.push(message)) {
            needsToPause = true
          }
        }
      }

      if (streamAsBatch) {
        needsToPause = !this.push(messages)
      }

      this.log?.debug({ messages }, 'received messages')
      this.log?.debug({ offsetTracker, unacknowledgedTracker }, 'current tracker')

      if (needsToPause) {
        this.log?.debug('pausing stream')
        this.consumerStream.pause()
      }
    })

    this.consumerStream.pause()
  }

  async _read(): Promise<void> {
    if (this.consumerStream.messages.length > 0) {
      this.log?.debug('consuming stream, messages buffered')
      this.consumerStream.resume()
      return
    }

    if (this.looping) {
      this.log?.debug('looping - return')
      return
    }

    try {
      this.looping = true

      if (this.hasOutstandingAcks()) {
        this.log?.debug('waiting for ack')
        await once(this, EVENT_ACK)
      }

      this.log?.debug('checking eof')
      const eof = await this.allMessagesRead()
      this.log?.debug({ eof }, 'eof return')

      if (!eof) {
        this.log?.debug('no eof - consuming stream')
        this.consumerStream.resume()
        return
      }

      this.log?.debug('eof reached - closing')
      await this.closeAsync()
    } catch (err) {
      this.log?.error({ err }, 'fatal err - destroying stream')
      this.destroy(err)
    } finally {
      this.looping = false
      this.log?.debug('setting looping to false')
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
      await once(this, EVENT_ACK)
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

      const trackerKey = ConsumerStream.trackingKey(partition)
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
   * Gets consumer assigned partitions positions from local cache
   * If no position available, queries Broker and stores for further reuse
   * `position` is currently fetched offset, it may not be commited yet
   */
  private async getPositions(assignments: TopicPartition[]): Promise<TopicPartition[]> {
    const commitedOffsets = await this.consumer.committedAsync(assignments, this.offsetQueryTimeout)
    for (const offset of commitedOffsets) {
      this.offsetTracker[ConsumerStream.trackingKey(offset)] = offset
    }

    this.log?.debug({ commitedOffsets }, 'positions')
    return commitedOffsets
  }

  private updatePartitionOffsets(partitions: TopicPartition[], set: CommitOffsetTracker): void {
    for (const topicPartition of partitions) {
      set[ConsumerStream.trackingKey(topicPartition)] = topicPartition
    }
  }

  private cleanPartitionOffsets(partitions: TopicPartition[], set: CommitOffsetTracker): void {
    for (const topicPartition of partitions) {
      set[ConsumerStream.trackingKey(topicPartition)] = undefined
    }
  }
}
