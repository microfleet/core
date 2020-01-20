import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginTypes, LoggerPlugin } from '@microfleet/core'
import { promisifyAll, map } from 'bluebird'

import {
  KafkaConsumer,
  Producer as KafkaProducer,
  ProducerStream,
  ConsumerStream,
  Client as KafkaClient,
} from 'node-rdkafka'

export { KafkaConsumer, KafkaProducer, KafkaClient, ProducerStream, ConsumerStream }

promisifyAll(KafkaConsumer.prototype)
promisifyAll(KafkaProducer.prototype)

import {
  TopicConfig,
  ProducerStreamOptions,
  ConsumerStreamOptions,
  KafkaConfig,
} from './types'

import { getLogFnName } from './log-mapping'

/**
 * Library hides consumer when using typescript
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

export type KafkaStream = ConsumerStream | ProducerStream
export type StreamOptions<T> = T extends ConsumerStream
    ? ConsumerStreamOptions
    : never
  | T extends ProducerStream
    ? ProducerStreamOptions
    : never

export class KafkaFactory implements KafkaPlugin {
  rdKafkaConfig: KafkaConfig
  private _streams: Set<KafkaStream>
  private _connections: Set<KafkaClient>
  private service: Microfleet & LoggerPlugin

  constructor(service: Microfleet & LoggerPlugin, config: KafkaConfig) {
    this.rdKafkaConfig = config
    this._streams = new Set<KafkaStream>()
    this._connections = new Set<KafkaClient>()
    this.service = service
  }

  async createConsumerStream(
    opts: ConsumerStreamOptions, conf?: Partial<KafkaConfig>, topicConf?: TopicConfig
  ): Promise<ConsumerStream> {
    const consumer = this.getClient(KafkaConsumer, conf, topicConf)
    await consumer.connectAsync(opts.connectOptions || {})
    return this.getStream<ConsumerStream>(kConsumerStream, consumer, opts)
  }

  async createProducerStream(
    opts: ProducerStreamOptions, conf?: Partial<KafkaConfig>, topicConf?: TopicConfig
  ): Promise<ProducerStream> {
    const producer = this.getClient(KafkaProducer, conf, topicConf)
    await producer.connectAsync(opts.connectOptions || {})
    return this.getStream<ProducerStream>(kProducerStream, producer, opts)
  }

  public getClient<T extends KafkaClient>(
    clientClass: new (c?: Partial<KafkaConfig>, tc?: TopicConfig) => T,
    conf?: Partial<KafkaConfig>,
    topicConf?: TopicConfig
  ): T {
    const config = { ...this.rdKafkaConfig, ...conf }
    const client = new clientClass(config, topicConf)
    this.assignClientEvents(client)

    return client
  }

  public getStream<T extends KafkaStream>(
    streamClass: new (c: KafkaClient, o: StreamOptions<T>) => T,
    client: KafkaClient,
    opts: StreamOptions<T>
  ): T {
    const stream = new streamClass(client, opts)
    this.registerStream(stream)
    return stream
  }

  public getStreams() {
    return this._streams
  }

  public getConnections() {
    return this._connections
  }

  async close(this: Microfleet) {
    const kafka = this[name]
    // Some connections will be already closed by streams
    await map(kafka._streams.values(), (stream: KafkaStream) => stream.closeAsync())
    // Close other connections
    await map(kafka._connections.values(), (connection: KafkaClient) => connection.disconnectAsync())
  }

  private assignClientEvents(client: KafkaClient) {
    client.on('ready', () => {
      this.registerClient(client)
    })

    client.on('event.log', (log: any) => {
      this.service.log[getLogFnName(log.severity)](log)
    })

    client.on('event.error', (log: any) => {
      this.service.log.error(log)
    })
  }

  private registerClient(client: KafkaClient) {
    client.on('disconnected', () => {
      this._connections.delete(client)
    })

    this._connections.add(client)
  }

  private registerStream(stream: KafkaStream) {
    stream.on('close', () => {
      this._streams.delete(stream)
    })

    this._streams.add(stream)
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
