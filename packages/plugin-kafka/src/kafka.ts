/* eslint-disable @typescript-eslint/no-var-requires */
import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import { LoggerPlugin } from '@microfleet/plugin-logger'
import { Microfleet, PluginTypes, PluginInterface } from '@microfleet/core'
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

export { ProducerStreamOptions, ConsumerStreamOptions }

import './rdkafka-extra-types'

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

export interface KafkaStreamOpts<T> {
  streamOptions: T;
  conf?: Partial<KafkaConfig>;
  topicConf?: TopicConfig;
}

export interface KafkaPlugin {
  kafka: KafkaFactoryInterface;
}

/**
 * Defines service extension
 */
export interface KafkaFactoryInterface {
  createConsumerStream(opts: KafkaStreamOpts<ConsumerStreamOptions>): Promise<ConsumerStream>;
  createProducerStream(opts: KafkaStreamOpts<ProducerStreamOptions>): Promise<ProducerStream>;
  close(): Promise<void>;
}

export type KafkaStream = ConsumerStream | ProducerStream
export type StreamOptions<T> = T extends ConsumerStream
    ? ConsumerStreamOptions
    : never
  | T extends ProducerStream
    ? ProducerStreamOptions
    : never

export class KafkaFactory implements KafkaFactoryInterface {
  rdKafkaConfig: KafkaConfig
  private streams: Set<KafkaStream>
  private connections: Set<KafkaClient>
  private service: Microfleet & LoggerPlugin

  constructor(service: Microfleet & LoggerPlugin, config: KafkaConfig) {
    this.rdKafkaConfig = config
    this.streams = new Set<KafkaStream>()
    this.connections = new Set<KafkaClient>()
    this.service = service
  }

  async createConsumerStream(opts: KafkaStreamOpts<ConsumerStreamOptions>): Promise<ConsumerStream> {
    const consumer = this.createClient(KafkaConsumer, opts.conf, opts.topicConf)
    await consumer.connectAsync(opts.streamOptions.connectOptions || {})
    return this.createStream<ConsumerStream>(kConsumerStream, consumer, opts.streamOptions)
  }

  async createProducerStream(opts: KafkaStreamOpts<ProducerStreamOptions>): Promise<ProducerStream> {
    const producer = this.createClient(KafkaProducer, opts.conf, opts.topicConf)
    await producer.connectAsync(opts.streamOptions.connectOptions || {})
    return this.createStream<ProducerStream>(kProducerStream, producer, opts.streamOptions)
  }

  async close() {
    // Some connections will be already closed by streams
    await map(this.streams.values(), (stream: KafkaStream) => stream.closeAsync())
    // Close other connections
    await map(this.connections.values(), (connection: KafkaClient) => connection.disconnectAsync())
  }

  getStreams() {
    return this.streams
  }

  getConnections() {
    return this.connections
  }

  private createStream<T extends KafkaStream>(
    streamClass: new (c: KafkaClient, o: StreamOptions<T>) => T,
    client: KafkaClient,
    opts: StreamOptions<T>
  ): T {
    const stream = new streamClass(client, opts)
    const { streams, service: { log } } = this

    streams.add(stream)
    stream.on('close', function close(this: T) {
      streams.delete(this)
      log.info('closed stream')
    })

    return stream
  }

  private createClient<T extends KafkaClient>(
    clientClass: new (c?: Partial<KafkaConfig>, tc?: TopicConfig) => T,
    conf?: Partial<KafkaConfig>,
    topicConf?: TopicConfig
  ): T {
    const config = { ...this.rdKafkaConfig, ...conf }
    const client = new clientClass(config, topicConf)
    const { log } = this.service
    const { connections } = this

    client.on('ready', function connected(this: T) {
      log.info('client ready')
      connections.add(this)
    })

    client.on('disconnected', function disconnected(this: T) {
      log.info('client disconnected')
      connections.delete(this)
    })

    client.on('event.log', (eventData: any) => {
      log[getLogFnName(eventData.severity)]({ eventData }, 'kafka event.log')
    })

    client.on('event.error', (err: Error) => {
      log.error({ err }, 'kafka client error')
    })

    return client
  }
}

/**
 * Plugin init function.
 * @param params - Kafka configuration.
 */
export function attach(
  this: Microfleet,
  params: KafkaConfig
): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const conf: KafkaConfig = this.validator.ifError(name, params)
  const kafkaPlugin = this[name] = new KafkaFactory(this, conf)

  return {
    async connect() {
      // noop, required by interface
    },
    async close() {
      await kafkaPlugin.close()
    },
  }
}
