import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginTypes, LoggerPlugin } from '@microfleet/core'
import debugLog from 'debug'
import { promisifyAll, map } from 'bluebird'

import {
  KafkaConsumer,
  Producer as KafkaProducer,
  ProducerStream,
  ConsumerStream,
} from 'node-rdkafka'

promisifyAll(KafkaConsumer.prototype)
promisifyAll(KafkaProducer.prototype)

import {
  TopicConfig,
  ProducerStreamOptions,
  ConsumerStreamOptions,
  KafkaConfig,
} from './types'

const debug = debugLog('plugin-kafka')

/**
 * Library hides consumer whe using typescript
 * https://blizzard.github.io/node-rdkafka/current/KafkaConsumerStream.html
 * But direct consumer creation was requested in
 * https://github.com/microfleet/core/pull/362#discussion_r367773758
 */
const kConsumerStream = require('node-rdkafka/lib/kafka-consumer-stream')
const kProducerStream = require('node-rdkafka/lib/producer-stream')

promisifyAll(kConsumerStream.prototype)
promisifyAll(kProducerStream.prototype)

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0
export const name = 'kafka'
export const type = PluginTypes.transport

/**
 * Defines service extension
 */
export interface KafkaPlugin {
  rdKafkaConfig: KafkaConfig
  createConsumerStream: (
    streamOptions: ConsumerStreamOptions,
    conf?: KafkaConfig,
    topicConf?: TopicConfig
  ) => Promise<ConsumerStream>
  createProducerStream: (
    streamOptions: ProducerStreamOptions,
    conf?: KafkaConfig,
    topicConf?: TopicConfig
  ) => Promise<ProducerStream>
  close: () => Promise<void>
}

type AnyStream = ConsumerStream | ProducerStream

export class KafkaFactory implements KafkaPlugin {
  rdKafkaConfig: KafkaConfig
  private _streams: Set<AnyStream>

  constructor(config: KafkaConfig) {
    this.rdKafkaConfig = config
    this._streams = new Set<AnyStream>()
  }

  async connectStream(stream: AnyStream) {
    const client = Object.prototype.hasOwnProperty.call(stream, 'consumer')
    ? (stream as ConsumerStream).consumer
    : (stream as ProducerStream).producer

    // Kafka debugging
    client.on('event.log', (log: any) => {
      debug(`[${log.severity}](${log.fac}): ${log.message}`)
    })

    stream.on('close', () => {
      if (this._streams.has(stream)) {
        this._streams.delete(stream)
      }
    })

    this._streams.add(stream)
  }

  async createConsumerStream(
    opts: ConsumerStreamOptions, conf?: Partial<KafkaConfig>, topicConf?: TopicConfig
  ): Promise<ConsumerStream> {
    const consumerConfig = { ...this.rdKafkaConfig, ...conf }
    const consumer = new KafkaConsumer(consumerConfig, topicConf)

    await consumer.connectAsync(opts.connectOptions)

    const stream = new kConsumerStream(consumer, opts)
    this.connectStream(stream)
    return stream
  }

  async createProducerStream(
    opts: ProducerStreamOptions, conf?: Partial<KafkaConfig>, topicConf?: TopicConfig
  ): Promise<ProducerStream> {
    const producerConfig = { ...this.rdKafkaConfig, ...conf }
    const producer = new KafkaProducer(producerConfig, topicConf)

    await producer.connectAsync(opts.connectOptions)

    const stream = new kProducerStream(producer, opts)
    this.connectStream(stream)

    return stream
  }

  async close(this: Microfleet) {
    const kafka = this[name]
    await map(kafka._streams.values(), (stream: AnyStream) => stream.closeAsync())
  }

  getStreams() {
    return this._streams
  }
}

/**
 * Plugin init function.
 * @param params - Kafka configuration.
 */
export function attach(
  this: Microfleet & LoggerPlugin,
  params: KafkaConfig
) {
  const service = this

  assert(service.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(service.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  service.validator.addLocation(resolve(__dirname, '../schemas'))

  const conf: KafkaConfig = service.ifError(name, params)

  service[name] = new KafkaFactory(conf)
  return service[name]
}
