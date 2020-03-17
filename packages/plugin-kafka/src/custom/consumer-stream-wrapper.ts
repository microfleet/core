import { Readable } from 'stream'
import * as assert from 'assert'
import { once } from 'events'
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

    this.config.offsetQueryTimeout = config.offsetQueryTimeout || 200

    stream.on('error', (e: Error) => {
      log('stream error', e)
      this.destroy(e)
    })

    stream.on('data', (chunk: any) => {
      log('stream data', chunk)
      const data = Array.isArray(chunk) ? chunk : [chunk]

      for (const message of data) {
        this.config.objectMode === true ? this.push(message) : this.push(message.value)
      }
    })
  }

  // tslint:disable-next-line: function-name
  public _destroy(err: Error | null, cb: (error?: Error | null | undefined) => void): void {
    this.stream.close(() => {
      cb(err)
    })
  }

  // tslint:disable-next-line: function-name
  public _read(size: number) {
    log('_read')
    const { config } = this
    if (config.stopOnPartitionsEOF === true) {
      log('read eof')
      const processResult = (eof: boolean | void): void => {
        if (eof === true) {
          this.push(null)
        } else {
          this.stream.read(size)
        }
      }

      const handleError = (e: Error) => {
        // we skip kafka timeout error
        // other errors will cause stream error
        if (e.message !== 'Local: Timed out') {
          this.destroy(e)
        }
      }

      this
        .allMessagesRead(config.offsetQueryTimeout!)
        .catch(handleError)
        .then(processResult)
    } else {
      log('read no eof')
      this.stream.read(size)
    }
  }

  public close(cb?: () => {}) {
    log('close')
    this.stream.on('close', () => {
      log('emit close')
      this.emit('close')
    })

    this.stream.close(cb)
  }

  public async closeAsync(): Promise<any> {
    log('async close')
    this.close()
    return once(this, 'close')
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
