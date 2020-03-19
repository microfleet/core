import { Readable } from 'stream'
import * as assert from 'assert'
import { find } from 'lodash'

import * as debug from 'debug'
const log = debug('kafka:wrapper-stream')

import {
  KafkaConsumer, KafkaConsumerStream, ConsumerStream as IConsumerStream, Client,
  CODES, TopicPartition
} from '../rdkafka-extra'
import { ConsumerStreamOptions } from '../types'

const kafkaErrorCodes = CODES.ERRORS

export class TrackableConsumerStream extends Readable {
  public consumer: KafkaConsumer
  public stream: IConsumerStream
  private config: ConsumerStreamOptions

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: Client, config: ConsumerStreamOptions) {
    assert(consumer.isConnected(), 'consumer should be connected')
    assert(consumer instanceof KafkaConsumer, 'should be intance of KafkaConsumer')

    const fetchSize = (config.fetchSize || 1)
    const highWaterMark = config.objectMode === true ? fetchSize + 2 : fetchSize

    super({
      highWaterMark,
      objectMode: config.objectMode,
    })

    this.consumer = consumer as KafkaConsumer
    this.config = config
    this.config.offsetQueryTimeout = config.offsetQueryTimeout || 200

    const stream = this.stream = new KafkaConsumerStream(consumer, config)

    consumer.on('offset.commit', this.handleCommitDelivery.bind(this))

    stream.on('error', (e: Error) => {
      log('GOT ERROR FROM SUBSTREAM')
      this.destroy(e)
    })

    stream.once('close', () => {
      log('GOT CLOSE FROM SUBSTREAM')
      this.close()
      // this.push(null)
    })

    stream.on('data', (chunk: any) => {
      const pushRes = this.config.objectMode === true ? this.push(chunk) : this.push(chunk.value)
      if (!pushRes) this.stream.pause()
    })
  }

  public async handleCommitDelivery(err: Error, msg: any): Promise<void> {
    const { consumer, config } = this

    log('offset.commit', err, msg)

    // https://github.com/edenhill/librdkafka/issues/2581#issuecomment-544891433
    if (err) return

    try {
      // assignments or watermark offsets unavailable
      // if consumer is not connected or restoring it's state
      if (!consumer.isConnected()) return

      const assignments = consumer.assignments()
      const localOffsets = assignments.map(
        (assignment: TopicPartition) => ({
          ...assignment,
          ...consumer.getWatermarkOffsets(assignment.topic, assignment.partition),
        })
      )

      // get committed offsets
      const localCommitedOffsets = await consumer.committedAsync(assignments, config.offsetQueryTimeout)

      // get offsets stored in client. They are synced on each `FETCH`.
      // If committed offsets and stored match - close stream.
      const allAssignmentStatus = localCommitedOffsets.map((localPartitionInfo) => {
        const { topic, partition, offset } = localPartitionInfo
        const topicPartitionOffset = find(localOffsets, { topic, partition })
        // (offset || 0) - partition assigned but has no data
        return topicPartitionOffset ? topicPartitionOffset.highOffset === (offset || 0) : false
      })

      if (!allAssignmentStatus.includes(false)) {
        this.push(null)
        return
      }
    } catch (e) {
      // committed offsets respose not received until rdkafka restores it's behavour
      if (e.code !== kafkaErrorCodes.ERR__TIMED_OUT) {
        log('some error', e)
        setImmediate(() => this.destroy(e))
      }
    }
    return
  }

  // tslint:disable-next-line: function-name
  public _destroy(error: Error | null, callback: (error?: Error | null | undefined) => void): void {
    if (! this.stream.destroyed) {
      this.stream.destroy(error || undefined)
    }
    callback(error)
  }

  // tslint:disable-next-line: function-name
  public _read(_: number): void {
    log('_READ')
    if (this.stream.messages.length > 0) return
    this.stream.resume()
  }

  public async close(): Promise<any> {
    log('_close')
    await this.stream.closeAsync()
    log('_close emit')
    this.emit('close')
  }

  public async closeAsync(): Promise<any> {
    return this.close()
  }
}
