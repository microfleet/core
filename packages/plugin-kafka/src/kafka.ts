import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginTypes, LoggerPlugin } from '@microfleet/core'
import { promisify } from 'util'
import debugLog from 'debug'

import {
  ProducerStream,
  ConsumerStream,
  KafkaConsumer,
  Producer,
} from 'node-rdkafka'

import {
  GlobalConfig,
  ProducerGlobalConfig,
  TopicConfig,
  ProducerStreamOptions,
  ConsumerStreamOptions,
  KafkaConfig,
} from './types'

// Library hides consumer whe using typescript
const kConsumerStream = require('node-rdkafka/lib/kafka-consumer-stream')
const kProducerStream = require('node-rdkafka/lib/producer-stream')

const debug = debugLog('plugin-kafka')

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
  rdConfig: KafkaConfig
  createConsumerStream: (
    streamOptions: ConsumerStreamOptions,
    conf?: KafkaConfig,
    topicConf?: TopicConfig
  ) => Promise<ConsumerStream>
  createProducerStream: (
    streamOptions: ProducerStreamOptions,
    conf?: ProducerGlobalConfig,
    topicConf?: TopicConfig
  ) => Promise<ProducerStream>
  close: () => Promise<void>
}

type AnyStream = ConsumerStream | ProducerStream

export class KafkaFactory implements KafkaPlugin {
  rdConfig: KafkaConfig
  connectTimeout: number
  _streams: Set<AnyStream>

  constructor(globalConf: GlobalConfig) {
    const { connectTimeout, ...rdConfig } = globalConf
    this.rdConfig = rdConfig
    this.connectTimeout = connectTimeout || 4999
    this._streams = new Set<AnyStream>()
  }

  async connectClient(client: KafkaConsumer | Producer, timeout?: number) {
    const connectClient = promisify(client.connect.bind(client))
    client.on('event.log', (log: any) => {
      debug(`[${log.severity}](${log.fac}): ${log.message}`)
    })
    await connectClient({
      allTopics: true,
      timeout: timeout || 5000,
    })
  }

  async createConsumerStream(
    opts: ConsumerStreamOptions, conf?: Partial<GlobalConfig>, topicConf?: TopicConfig
  ): Promise<ConsumerStream> {
    const consumerConfig = { ...this.rdConfig, ...conf, offset_commit_cb: true }
    const consumer = new KafkaConsumer(consumerConfig, topicConf)
    await this.connectClient(consumer)
    const stream = new kConsumerStream(consumer, opts)
    this.assignEventHandlers(stream)
    return stream
  }

  async createProducerStream(
    opts: ProducerStreamOptions, conf?: ProducerGlobalConfig, topicConf?: TopicConfig
  ): Promise<ProducerStream> {
    const producerConfig = { ...this.rdConfig, ...conf, dr_cb: true }
    const producer = new Producer(producerConfig, topicConf)
    await this.connectClient(producer)
    const stream = new kProducerStream(producer, opts)
    this.assignEventHandlers(stream)
    return stream
  }

  assignEventHandlers(stream: AnyStream) {
    this._streams.add(stream)
    stream.on('close', () => {
      if (this._streams.has(stream)) {
        this._streams.delete(stream)
      }
    })
  }

  async close(this: Microfleet) {
    const streamsToClean: Promise<void>[] = []
    const kafka = this[name]

    kafka._streams.forEach((stream: AnyStream) => {
      const closePromise = promisify<void>(stream.close.bind(stream))
      streamsToClean.push(closePromise())
    })

    await Promise.all(streamsToClean)
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

  service[name] = new KafkaFactory(service, conf)
  return service[name]
}
