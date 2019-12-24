import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginTypes, LoggerPlugin } from '@microfleet/core'
import { promisify } from 'util'
import debugLog from 'debug'
import { once } from 'events'

import {
  ProducerStream,
  ConsumerStream,
  createReadStream,
  createWriteStream,
} from 'node-rdkafka'

import {
  TopicConfig,
  ProducerStreamOptions,
  ConsumerStreamOptions,
  KafkaConfig,
} from './types'

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

    const connectError = once(stream, 'error')
    const connectSuccess = once(client, 'ready')

    const [raceResult] = await Promise.race([connectError, connectSuccess])

    if (raceResult instanceof Error) {
      throw raceResult
    }

    // We don't need this listener further
    const errorListener = stream.listeners('error')[0] as (...args: any[]) => void
    stream.removeListener('error', errorListener)

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
    const consumerConfig = { ...this.rdKafkaConfig, ...conf, offset_commit_cb: true }

    const stream = createReadStream(consumerConfig, topicConf, opts)
    await this.connectStream(stream)

    return stream
  }

  async createProducerStream(
    opts: ProducerStreamOptions, conf?: Partial<KafkaConfig>, topicConf?: TopicConfig
  ): Promise<ProducerStream> {
    const producerConfig = { ...this.rdKafkaConfig, ...conf, dr_msg_cb: true }

    const stream = createWriteStream(producerConfig, topicConf, opts)
    await this.connectStream(stream)

    return stream
  }

  async close(this: Microfleet) {
    const kafka = this[name]
    const streamsToClean = [...kafka._streams.values()]
      .map((stream: AnyStream) => {
        return promisify(stream.close.bind(stream))()
      })
    await Promise.all(streamsToClean)
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
