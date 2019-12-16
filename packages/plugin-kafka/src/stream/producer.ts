import { Microfleet } from '@microfleet/core'
import * as rdkafka from 'node-rdkafka'
import { promisify, inspect } from 'util'

import { KafkaConfig, ProducerStreamOptions, TopicConfig } from '../types'
import { MessageStorage } from '../util/message-storage'

const uuidV4 = require('uuid/v4')

const kProducerStream = require('node-rdkafka/lib/producer-stream')

const streamDefaults = {
  objectMode: true,
}

export class Producer {
  service: Microfleet
  streamConfig?: ProducerStreamOptions
  topicConfig?: TopicConfig

  _producer!: rdkafka.Producer
  _stream!: rdkafka.ProducerStream

  deliveryTimeout: number

  messageStorage: MessageStorage

  constructor(service: Microfleet, kafkaConfig: KafkaConfig) {
    const { connection, producer } = kafkaConfig
    const producerConfig = producer!

    this.messageStorage = new MessageStorage()

    this.service = service
    this.streamConfig = producerConfig.stream
    this.topicConfig = producerConfig.topicConfig
    this.deliveryTimeout = producerConfig.deliveryTimeout || 5000

    const connectionConfig = {
      ...connection,
      ...producerConfig.connection,
      dr_cb: this.onDeliveryReport.bind(this),
    }

    this._producer = new rdkafka.Producer(connectionConfig, producerConfig.topicConfig)
  }

  async connect(timeout?: number) {
    const connectProducer = promisify(this._producer.connect.bind(this._producer))

    this._producer.on('event.log', (log: any) => {
      console.debug(`kaf[${log.severity}](${log.fac}): ${log.message}`)
    })

    this.assignEvents(this._producer)

    await connectProducer({
      allTopics: true, // changeme maybe???
      timeout: timeout || 5000,
    })

    this._stream =  new kProducerStream(this._producer, { ...this.streamConfig, ...streamDefaults })
  }

  async write(topic: string, value: Object) {
    const write = promisify(this._stream.write.bind(this._stream))
    const messageId = `${topic}-${uuidV4()}`

    const message = {
      topic, value,
      opaque: {
        id: messageId,
      },
    }

    const writePromise = new Promise((resolve, reject) => {
      this.messageStorage.push(messageId, {
        reject,
        resolve,
        timeout: this.deliveryTimeout,
        timer: 0,
      })
    })

    write(message).catch((e) => {
      this.messageStorage.reject(messageId, e)
    })

    return writePromise
  }

  async close() {
    if (this._producer.isConnected()) {
      const disconnect = promisify(this._producer.disconnect.bind(this._producer))
      await disconnect()
    }
  }

  private onDeliveryReport(err: any, res: any) {
    const messageId = res.opaque.id

    if (err !== null) {
      err.res = res // Dirty but save
      this.messageStorage.reject(messageId, err)
    } else {
      const msgInfo = this.messageStorage.pop(messageId)
      if (msgInfo !== undefined) {
        msgInfo.resolve(res)
      }
    }
  }

  // TODO REMOVEME
  private assignEvents(producer: rdkafka.Producer) {
    producer.on('event.error', (eFromC: Error) => {
      console.debug('got event.error', inspect(eFromC, { colors: true }))
    })

    producer.on('error', (e: Error) => {
      console.debug('got error', inspect(e, { colors: true }))
    })
  }
}
