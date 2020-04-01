import { Readable } from 'readable-stream'
import * as assert from 'assert'
import { once } from 'events'
import { find } from 'lodash'
import { map } from 'bluebird'

import { LoggerPlugin } from '@microfleet/core'

import {
  KafkaConsumer, KafkaConsumerStream as OriginalConsumerStream, ConsumerStreamMessage,
  TopicPartition, CODES as KafkaCodes
} from './rdkafka-extra'

import { ConsumerStreamOptions } from '@microfleet/plugin-kafka-types'

export interface CommitOffsetTracker {
  [topicNamePartition: string]: TopicPartition | null | undefined
}

const { ERRORS: KafkaErrorCodes } = KafkaCodes
const { ERR__ASSIGN_PARTITIONS, ERR__REVOKE_PARTITIONS, ERR_UNKNOWN_MEMBER_ID } = KafkaErrorCodes

export type KafkaError = Error & {
  code: number
}

export const EVENT_ACK = 'acknowledged'
export const EVENT_CONSUMED = 'consumed'

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
  private consumerStream: OriginalConsumerStream
  private offsetQueryTimeout: number
  private offsetTracker: CommitOffsetTracker
  private unacknowledgedTracker: CommitOffsetTracker
  private log?: LoggerPlugin['log']
  private looping: boolean
  private consuming: boolean
  private destroying: boolean
  private autoStore: boolean

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: KafkaConsumer, config: ConsumerStreamOptions, log?: LoggerPlugin['log']) {
    assert(consumer.isConnected(), 'consumer should be connected')
    assert(consumer instanceof KafkaConsumer, 'should be intance of KafkaConsumer')

    const highWaterMark = config.streamAsBatch ? 1 : config.fetchSize || 1
    // If we work in batch mode every substream read will return n records
    // so we must limit highwatermark of our stream
    super({ highWaterMark, objectMode: true })

    this.log = log
    this.looping = false
    this.consuming = false
    this.destroying = false
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
            this.consuming = true
            break

          case ERR__REVOKE_PARTITIONS:
            this.cleanPartitionOffsets(assignments, this.offsetTracker)
            this.cleanPartitionOffsets(assignments, this.unacknowledgedTracker)
            this.consuming = false
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

        const kafkaError = err as KafkaError
        // This is one of the worst errors
        // commits with this error are invalidated and offsets are lost
        if (kafkaError.code === ERR_UNKNOWN_MEMBER_ID) {
          this.destroy(err)
        }
        return
      }

      this.updatePartitionOffsets(partitions, this.offsetTracker)

      // once all acks were processed - be done with it
      if (!this.hasOutstandingAcks()) {
        this.log?.info('commit +ack')
        this.emit(EVENT_ACK)

        this.log?.info('commit +consumed')
        this.emit(EVENT_CONSUMED)

        // avoid dead loops
        this.consuming = false
      }
    })

    this.consumerStream = new OriginalConsumerStream(consumer, {
      ...config,
      objectMode: true,
      streamAsBatch: true,
    })

    this.consumer.removeAllListeners('unsubscribed')
    this.consumer.on('unsubscribed', () => {
      this.log?.debug('UNSUBSCRIBED!!!')
      this.push(null)
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
      if (this.destroying) {
        this.consumerStream.pause()
      }

      this.consuming = true
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
    if (this.looping && !this.destroying) {
      this.log?.debug('looping - return', this.destroying)
      return
    }

    try {
      this.looping = true

      if (this.hasOutstandingAcks()) {
        this.log?.debug('waiting for ack')
        await once(this, EVENT_ACK)
      }

      if (this.destroying) {
        this.log?.debug('_read invalidate destroying')
        this.push(null)
        return
      }

      this.log?.debug('checking eof')
      const eof = await this.allMessagesRead()
      this.log?.debug({ eof }, 'eof return')

      if (!eof) {
        this.log?.debug('no eof - consuming stream')
        // this.consuming = true
        this.consumerStream.resume()
        return
      }

      this.log?.debug('eof reached - closing')

      // safe circuit braker
      if (!this.hasOutstandingAcks()) this.consuming = false

      await this.closeAsync()
      this.log?.debug('eof reached - closed')
    } catch (err) {
      this.log?.error({ err }, 'fatal err - destroying stream')
      this.destroy(err)
    } finally {
      this.looping = false
      this.log?.debug('setting looping to false')
    }
  }

  _destroy(err: Error | null | undefined, callback?: (err: Error | null) => void): void {
    if (this.consumerStream.destroyed) {
      if (callback) process.nextTick(callback)
      return
    }

    this.consumerStream.destroy(err || undefined)
    if (callback) {
      this.consumerStream.once('close', () => callback(err || null))
    }
  }

  destroy(err?: Error | undefined, callback?: ((error: Error | null) => void) | undefined): this {
    this.log?.debug('destroy - called')

    if (err) {
      this.log?.debug({ err }, 'destroy - called with error')
      // if there was an error, we should invalidate all blocks
      this.consuming = false
      super.destroy(err, callback)
      return this
    }

    this.destroying = true

    if (this.consuming) {
      this.log?.debug('destroy - setting event listener')
      this.once(EVENT_CONSUMED, () => {
        super.destroy(err, callback)
      })
    } else {
      super.destroy(err, callback)
    }

    return this
  }

  close(cb?: (err?: Error | null) => void): void {
    this.log?.debug('close called')
    if (this.destroyed) {
      return
    }
    this.destroy(undefined, cb)
  }

  async closeAsync(): Promise<void> {
    this.log?.debug('close async called')
    if (this.destroyed) {
      return
    }
    this.log?.debug({ consuming: this.consuming, destroying: this.destroying, destroyed: this.destroyed }, 'calling close from async')
    this.close()
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
   * Gets consumer assigned partitions positions from local cache
   * If no position available, queries Broker and stores for further reuse
   * `position` is currently fetched offset, it may not be commited yet
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
