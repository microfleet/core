import { Readable } from 'readable-stream'
import * as assert from 'assert'
import { once } from 'events'
import { find } from 'lodash'
import { map, resolve, race, promisify } from 'bluebird'
import { helpers as ErrorHelpers } from 'common-errors'

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
export const EVENT_DESTROYING = 'destroying'
export const EVENT_OFFSET_COMMIT_ERROR = 'offset.commit.error'

export const OffsetCommitError = ErrorHelpers.generateClass('OffsetCommitError', {
  args: ['partitions', 'inner_error'],
})

export const CriticalErrors = [
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

    this.consumer.on('rebalance', async (err: KafkaError, assignments: TopicPartition[] = []) => {
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
        this.emit(EVENT_CONSUMED)
      }
    })

    this.consumer.on('offset.commit', (err: Error, partitions: TopicPartition[]) => {
      this.log?.debug({ err, partitions }, 'offset.commit')

      if (err) {
        const wrappedError = new OffsetCommitError(partitions, err)
        this.emit(EVENT_OFFSET_COMMIT_ERROR, wrappedError)

        // Should be Error but current version returns error code
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

        this.log?.info('commit +consumed')
        this.emit(EVENT_CONSUMED)

        // consumed all buferred messages
        this.consuming = false
      }
    })

    this.consumerStream = new OriginalConsumerStream(consumer, {
      ...config,
      objectMode: true,
      streamAsBatch: true,
    })

    this.consumer.on('event.error', (err) => {
      this.log?.error({ err }, 'consumer event.error')
    })

    this.consumer.on('data', (message: ConsumerStreamMessage) => {
      this.log?.debug({ message }, 'low-level message')
    })

    this.consumerStream.on('error', (err) => {
      this.log?.debug({ err }, 'consumerStream error')
      if (!this.destroying) this.emit('error', err)
    })

    this.consumerStream.once('close', async () => {
      // skip if we already destroying
      this.log?.debug('received close: closing stream')

      if (this.destroying) {
        this.log?.debug('received close: in state destroying')
      } else {
        this.log?.debug('received close: in state working')
        this.destroy()
      }
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

  async acked(): Promise<Boolean> {
    return race([
      resolve(once(this, EVENT_ACK))
        .tap(() => { this.log?.debug('acked: with ACK event') })
        .return(true),
      resolve(once(this, EVENT_DESTROYING))
        .tap(() => { this.log?.debug('acked: with DESTROYING event') })
        .return(false),
    ])
  }

  async _read(): Promise<void> {
    if (this.looping && !this.destroying) {
      this.log?.debug('looping - return', this.destroying)
      return
    }

    this.looping = true

    try {
      if (this.hasOutstandingAcks()) {
        this.log?.debug('waiting for ack')
        if (!await this.acked()) return
      }

      if (this.destroying) {
        this.log?.debug('_read invalidate destroying')
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

      this.log?.debug(
        { consuming: this.consuming, destroying: this.destroying, destroyed: this.destroyed },
        'eof reached - closing'
      )

      if (!this.destroying) {
        if (!this.hasOutstandingAcks()) this.consuming = false
        await this.closeAsync()
        this.log?.debug('eof reached - closed')
      }
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
      if (callback) callback(err || null)
      return
    }

    this.log?.debug('_destroy close consumer stream')
    // invalidate assignments otherwise rebalance_cb will be called later
    // and block some rdkafka threads
    this.consumer.assign([])
    this.consumerStream.destroy()
    this.consumerStream.once('close', () => {
      this.log?.debug('_destroy consumer stream closed', err, callback)
      if (callback) callback(null)
    })
  }

  destroy(err?: Error | undefined, callback?: ((error: Error | null) => void) | undefined): this {
    this.log?.debug('destroy - called')

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
      // if there was an error, we should invalidate all blocks
      this.consuming = false
      // invalidate ack waits
      this.emit(EVENT_DESTROYING)
      this.log?.debug({ err, callback }, 'destroy - called with error')
    }

    if (this.consuming) {
      this.log?.debug('destroy - setting event listener')
      this.once(EVENT_CONSUMED, () => {
        this.log?.debug('destroy - event received destroying')
        superDestroy()
      })
    } else {
      this.log?.debug('destroy - nowait consume')
      superDestroy()
    }

    return this
  }

  close(cb?: (err?: Error | null) => void): void {
    this.log?.debug('close called')
    this.destroy(undefined, (err) => {
      this.log?.debug('close callback')
      if (cb) cb(err)
    })
  }

  async closeAsync(): Promise<void> {
    this.log?.debug({ consuming: this.consuming, destroying: this.destroying, destroyed: this.destroyed }, 'calling close from async')
    await promisify(this.close, { context: this })()
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
      // jump out of here is stream is destroying
      // assignments or other could be unavailable here
      if (!await this.acked()) {
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
