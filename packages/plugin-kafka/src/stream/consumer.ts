import { Microfleet } from '@microfleet/core'
import * as rdkafka from 'node-rdkafka'
import { promisify, inspect } from 'util'
import * as assert from 'assert'

import { ConsumerStreamOptions, TopicConfig, KafkaConfig } from '../types'
import { MessageStorage } from '../util/message-storage'
import { Readable } from 'stream'

// Library hides consumer whe using typescript
const kConsumerStream = require('node-rdkafka/lib/kafka-consumer-stream')

const streamDefaults = {
  objectMode: true,
}

export class Consumer {
  service: Microfleet
  storage: MessageStorage

  streamConfig: ConsumerStreamOptions
  topicConfig?: TopicConfig
  commitTimeout: number

  _consumer!: rdkafka.KafkaConsumer
  stream!: rdkafka.ConsumerStream

  constructor(service: Microfleet, config: KafkaConfig) {
    const { consumer, connection } = config
    const consumerConfig = consumer!

    this.service = service
    this.commitTimeout = consumerConfig.commitTimeout || 5000
    this.streamConfig = consumerConfig.stream!
    this.topicConfig = consumerConfig.topicConfig!

    this.storage = new MessageStorage()

    const connectionConfig = {
      ...connection,
      ...consumerConfig.connection,
      offset_commit_cb: this.onOffsetCommit.bind(this),
    }

    this._consumer = new rdkafka.KafkaConsumer(connectionConfig, this.topicConfig)

  }

  async connect(timeout?: number) {
    const connectConsumer = promisify(this._consumer.connect.bind(this._consumer))

    this._consumer.on('event.log', (log: any) => {
      console.debug(`kaf[${log.severity}](${log.fac}): ${log.message}`) // this.service.log.debug(log)
    })

    // TODO REMOVEME watch for additional events
    this.assignEvents(this._consumer)

    await connectConsumer({
      allTopics: true,
      timeout: timeout || 5000,
    })
  }

  consume(topics: string[] | string): Readable {
    assert(this._consumer.isConnected(), 'Consumer not connected')
    const streamConfig = { ...this.streamConfig, ...streamDefaults, topics }
    this.stream = new kConsumerStream(this._consumer, streamConfig)
    return this.stream
  }

  async close() {
    if (this._consumer.isConnected()) {
      const disconnect = promisify(this._consumer.disconnect.bind(this._consumer))
      await disconnect()
    }
  }

  async commitMessage(msg: rdkafka.ConsumerStreamMessage): Promise<any> {
    const { topic, offset, partition } = msg
    const id = `${topic}_${partition}_${offset + 1}`
    const timeout = 1000 // TODO CHANGEME

    const commitPromise = new Promise<any>((resolve, reject) => {
      this.storage.push(id, {
        resolve,
        reject,
        timeout,
        timer: 0,
      })
    })

    this._consumer.commitMessage(msg)

    return commitPromise
  }

  private onOffsetCommit(err: Error | any, res: any) {
    for (const commitResponse of res) {
      const { topic, offset, partition } = commitResponse
      const id = `${topic}_${partition}_${offset}`

      if (err !== undefined) {
        err.res = commitResponse // We should save response received from kafka
        this.storage.reject(id, err)
      } else {
        const msgInfo = this.storage.pop(id)
        if (msgInfo !== undefined) {
          msgInfo.resolve(res)
        }
      }
    }
  }

  // TODO REMOVEME
  private assignEvents(consumer: rdkafka.KafkaConsumer) {
    consumer.on('event.error', (eFromC: Error) => {
      console.debug('got event.error', inspect(eFromC, { colors: true }))
      // throw eFromC
    })

    consumer.on('error', (e: Error) => {
      console.debug('got error', inspect(e, { colors: true }))
      // throw eFromC
    })
  }
}
