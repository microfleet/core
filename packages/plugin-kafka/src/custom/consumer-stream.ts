import { Readable } from 'readable-stream'
import { once } from 'events'
import * as assert from 'assert'

import { KafkaConsumer, ConsumerStreamMessage, KafkaClient } from '../rdkafka-extra'
import { ConsumerStreamOptions } from '../types'

/**
 * Helps to read data from Kafka topic.
 * Allows to track consumer offset position and exit on EOF
 * Replaces `node-rdkafka/ConsumerStream`
 */
export class ConsumerStream extends Readable {
  public consumer: KafkaConsumer
  private config: ConsumerStreamOptions
  private messages: ConsumerStreamMessage[]
  private boundOnRead: (err: Error, messages: ConsumerStreamMessage[]) => void

  /**
   * @param consumer Connected kafka consumer
   * @param config Topic configuration
   */
  constructor(consumer: KafkaClient, config: ConsumerStreamOptions) {
    assert(consumer.isConnected(), 'Consumer should be connected!')

    super({
      objectMode: true,
      highWaterMark: (config.fetchSize || 0) + 2,
    })

    this.consumer = consumer as KafkaConsumer
    this.config = config
    this.config.offsetQueryTimeout = config.offsetQueryTimeout || 200

    this.messages = []
    this.boundOnRead = this.onRead.bind(this)

    this.setupConsumer()
  }

  // tslint:disable-next-line
  public _read(size?: number): boolean | void {
    const { config } = this
    const fetchSize = size! >= config.fetchSize! ? config.fetchSize : size!

    if (this.messages.length > 0) {
      return this.push(this.messages.shift())
    }

    if (this.destroyed) return

    if (config.stopOnPartitionsEOF === true) {
      const processResult = (eof: boolean | void): void => {
        if (eof === true) {
          this.push(null)
        } else {
          this.consumer.consume(fetchSize!, this.boundOnRead)
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
      this.consumer.consume(fetchSize!, this.boundOnRead)
    }
  }

  // tslint:disable-next-line
  public _destroy () {
    if (this.destroyed) {
      return
    }
    this.destroyed = true
  }

  public close(cb?: () => {}) {
    if (cb) this.once('close', cb)

    if (!this.consumer.isConnected()) {
      this.emit('close')
      return
    }

    this.consumer.unsubscribe()
    this.consumer.disconnect(() => {
      this.emit('close')
    })
  }

  public async closeAsync(): Promise<any> {
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

  private setupConsumer(): void {
    this.consumer.on('unsubscribed', () => {
      this.push(null)
    })
    this.once('end', this.destroy.bind(this))

    try {
      const topics = Array.isArray(this.config.topics) ? this.config.topics : [this.config.topics]
      this.consumer.subscribe(topics)
    } catch (e) {
      this.emit('error', e)
      this.destroy()
    }
  }

  private onRead(err: Error, messages: ConsumerStreamMessage[]) {
    if (err) this.emit('error', err)

    if (err || messages.length < 1) {
      this.retry()
      return
    }

    const { streamAsBatch } = this.config
    if (streamAsBatch) {
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
