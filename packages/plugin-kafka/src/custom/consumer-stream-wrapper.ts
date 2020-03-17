import { Readable } from 'stream'
import * as assert from 'assert'
// import { once } from 'events'
import * as debug from 'debug'

const log = debug('kafka:wrapper-stream')

import { KafkaConsumer, Client, KafkaConsumerStream, ConsumerStream } from '../rdkafka-extra'
import { ConsumerStreamOptions } from '../types'
// import { ConsumerStreamMessage } from 'node-rdkafka'

export class ConsumerStreamWithOffsets extends Readable {
  public consumer: KafkaConsumer
  public stream: ConsumerStream
  private config: ConsumerStreamOptions
  // private messages: ConsumerStreamMessage[]

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: Client, config: ConsumerStreamOptions) {
    log('create wrapper')
    assert(consumer.isConnected(), 'consumer should be connected')
    assert(consumer instanceof KafkaConsumer, 'should be intance of KafkaConsumer')
    const fetchSize = (config.fetchSize || 1)
    const highWaterMark = config.objectMode === true ? fetchSize + 2 : fetchSize

    log('super', {
      highWaterMark,
      config,
      objectMode: config.objectMode,
    })

    super({
      highWaterMark,
      objectMode: config.objectMode,
    })

    this.consumer = consumer as KafkaConsumer
    this.config = config
    // this.messages = []

    const stream: ConsumerStream = this.stream = new KafkaConsumerStream(consumer, config)

    this.config.offsetQueryTimeout = 4000 // config.offsetQueryTimeout || 200

    stream.on('error', (e: Error) => {
      log('stream error', e)
      this.destroy(e)
    })

    stream.once('close', () => {
      log('strem close')
      this.push(null)
    })

    stream.on('data', (chunk: any) => {
      log('stream data', chunk)
      const pushRes = this.config.objectMode === true ? this.push(chunk) : this.push(chunk.value)
      if (!pushRes) {
        log('stream data pause')
        this.stream.pause()
      }
    })
  }

  // tslint:disable-next-line: function-name
  public _destroy(err: Error | null, cb: (error?: Error | null | undefined) => void): void {
    log('_destroy')

    if (this.stream.destroyed) {
      log('_destroy stream already destroyed')
      if (cb) cb(err) // process.nextTick(cb, err)
      return
    }

    log('_destroy stream')
    this.stream.close(cb)

    if (cb) {
      log('_destroy set callback')
      this.once('close', cb)
    }
  }

  // tslint:disable-next-line: function-name
  public async _read(_: number): Promise<void> {
    // @ts-ignore
    log('_read stream messages length', this.stream.messages.length)

    // @ts-ignore
    if (this.stream.messages.length > 0) {
      // @ts-ignore
      log('_read resume stream', this.stream.messages.length)
      this.stream.resume()
      return
    }

    log('_read data')
    try {
      const eof = await this.allMessagesRead(this.config.offsetQueryTimeout!)
      if (!eof) {
        log('_read not eof', eof)
        this.stream.resume()
        return
      }
      log('_read reach eof')
      await this.close()
    } catch (e) {
      log('_read error', e)
      this.destroy(e)
    }
  }

  public async close(): Promise<any> {
    await this.stream.closeAsync()
  }

  public async closeAsync(): Promise<any> {
    return this.close()
  }

  /**
   * Detects EOF of consumed topic partitions
   * @param operationTimeout KafkaClient.committed and KafkaClient.queryWatermarkOffsets timeout
   */
  public async allMessagesRead(operationTimeout: number): Promise<boolean> {
    const { consumer } = this
    const assignments = consumer.assignments()

    // consumer didn't received assignment
    // this happens when consumer count greater than partition count
    // or Kafka rebalance in progress
    if (assignments.length === 0) return false

    const commitedOffsets = await consumer.committedAsync(consumer.assignments(), operationTimeout)

    const serverOffsetPromises = commitedOffsets.map(
      async (position: any) => {
        const watermark = await consumer.queryWatermarkOffsetsAsync(
          position.topic,
          position.partition,
          operationTimeout
        )
        return position.offset === watermark.highOffset
      }
    )

    const serverOffsets = await Promise.all(serverOffsetPromises)
    return !serverOffsets.includes(false)
  }
}
