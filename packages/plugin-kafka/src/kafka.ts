/* eslint-disable @typescript-eslint/no-var-requires */
import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import type { Microfleet, PluginInterface } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'
import type { Logger } from '@microfleet/plugin-logger'
import '@microfleet/plugin-validator'
import { map } from 'bluebird'
import type { WriteStreamOptions } from 'node-rdkafka'
import type {
  ConsumerStreamConfig,
  ProducerStreamConfig,
  ConsumerStreamOptions,
  KafkaClient,
} from '@microfleet/plugin-kafka-types'
import {
  TopicConfig,
  GlobalConfig,
  KafkaConsumer,
  Producer as KafkaProducer,
  KafkaProducerStream,
  LibrdKafkaError,
  Client,
  KafkaClientEvents,
  CODES as RdKafkaCodes,
} from './custom/rdkafka-extra'
import { getLogFnName, topicExists } from './util'
import { KafkaConsumerStream } from './custom/consumer-stream'
import { KafkaAdminClient } from './custom/admin-client'

export { OffsetCommitError, UncommittedOffsetsError, TopicNotFoundError } from './custom/errors'
export { DeleteTopicRequest, CreateTopicRequest, RetryOptions } from './custom/admin-client'

export { KafkaConsumerStream, KafkaProducerStream, RdKafkaCodes }

export * from './custom/rdkafka-extra'
export type {
  ProducerStreamOptions, ConsumerStreamOptions,
  ConnectOptions, ConsumerStreamConfig, KafkaStreamOpts, ProducerStreamConfig
} from '@microfleet/plugin-kafka-types'

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0
export const name = 'kafka'
export const type = PluginTypes.transport

declare module '@microfleet/core-types' {
  export interface Microfleet {
    kafka: KafkaFactory;
  }
}

export type KafkaStream = KafkaProducerStream | KafkaConsumerStream
export type StreamOptions<T> =
  T extends KafkaConsumerStream
  ? ConsumerStreamOptions
  : never
  |
  T extends KafkaProducerStream
  ? WriteStreamOptions
  : never

export class KafkaFactory {
  public rdKafkaConfig: GlobalConfig
  public admin: KafkaAdminClient

  private streams: Set<KafkaStream>
  private connections: Set<KafkaClient>
  private service: Microfleet

  constructor(service: Microfleet, config: GlobalConfig) {
    this.rdKafkaConfig = config
    this.streams = new Set<KafkaStream>()
    this.connections = new Set<KafkaClient>()
    this.service = service
    this.admin = new KafkaAdminClient(service, this)
  }

  public async createConsumerStream(opts: ConsumerStreamConfig): Promise<KafkaConsumerStream> {
    const { topics, checkTopicExists } = opts.streamOptions
    const consumerConfig: ConsumerStreamConfig['conf'] = {
      ...opts.conf,
      offset_commit_cb: opts.conf?.offset_commit_cb || true,
      rebalance_cb: opts.conf?.rebalance_cb || true,
      'enable.auto.offset.store': false,
      'enable.partition.eof': true, // new feature, allows us to listen to eof event
    }

    // pass on original value
    opts.streamOptions.autoOffsetStore = opts.conf?.['enable.auto.offset.store']

    const consumerTopicConfig: ConsumerStreamConfig['topicConf'] = { ...opts.topicConf }
    const logMeta = { ...opts.meta,  topics, type: 'consumer' }
    const log = this.service.log.child(logMeta)
    const consumer = this.createClient(KafkaConsumer, consumerConfig, consumerTopicConfig)

    this.attachClientLogger(consumer, log)

    let { connectOptions } = opts.streamOptions

    // we should avoid the side effect of automatic topic creation if we want to check whether it exists
    // https://github.com/Blizzard/node-rdkafka/blob/master/src/connection.cc#L177
    if (checkTopicExists && connectOptions) {
      connectOptions = {
        timeout: connectOptions.timeout,
        allTopics: true
      }
    }

    const brokerMeta = await consumer.connectAsync(connectOptions || {})

    if (checkTopicExists) topicExists(brokerMeta.topics, topics)

    return this.createStream(KafkaConsumerStream, consumer, opts.streamOptions, log)
  }

  public async createProducerStream(opts: ProducerStreamConfig): Promise<KafkaProducerStream> {
    const logMeta = { type: 'producer', topic: opts.streamOptions.topic }
    const log = this.service.log.child(logMeta)
    const producer = this.createClient(KafkaProducer, opts.conf, opts.topicConf)

    this.attachClientLogger(producer, log)

    await producer.connectAsync(opts.streamOptions.connectOptions || {})
    return this.createStream(KafkaProducerStream, producer, opts.streamOptions, log)
  }

  public async close(): Promise<void> {
    // Disconnect admin client
    this.admin.close()
    this.service.log.debug('admin closed')

    // Some connections will be already closed by streams
    this.service.log.debug({ size: this.streams.size }, 'closing streams')
    await map(this.streams.values(), stream => stream.closeAsync())
    this.service.log.debug('streams closed')

    // Close other connections
    this.service.log.debug({ size: this.connections.size }, 'closing connections')
    await map(this.connections.values(), (connection): Promise<any> => connection.disconnectAsync())
    this.service.log.debug('connections closed')
  }

  public getStreams(): Set<KafkaStream> {
    return this.streams
  }

  public getConnections(): Set<KafkaClient> {
    return this.connections
  }

  private createStream<T extends KafkaStream, U extends KafkaClient>(
    streamClass: new (c: U, o: StreamOptions<T>, log?: Logger) => T,
    client: U,
    opts: StreamOptions<T>,
    log?: Logger,
  ): T {
    const stream = new streamClass(client, opts, log)
    const { streams } = this

    streams.add(stream)

    stream.on('close', function close(this: T) {
      streams.delete(this)
      log?.info('closed stream')
    })

    stream.on('end', function end(this: T) {
      log?.info('stream end')
    })

    return stream
  }

  public createClient<T extends KafkaClient, U extends GlobalConfig, Z extends TopicConfig>(
    clientClass: new (c: U, tc: Z) => T,
    conf: U = {} as U,
    topicConf: Z = {} as Z
  ): T {
    const config: U = { ...this.rdKafkaConfig as U, ...conf }
    return new clientClass(config, topicConf)
  }

  public attachClientLogger(client: Client<KafkaClientEvents>, log: Logger, meta: any = {}): void {
    const { connections } = this

    client.on('ready', function connected(this: KafkaClient) {
      log.info(meta, 'client ready')
      connections.add(this)
    })

    client.once('disconnected', function disconnected(this: KafkaClient) {
      log.info(meta, 'client disconnected')
      connections.delete(this)
      this.removeAllListeners()
    })

    client.on('event.log', (eventData: any) => {
      log[getLogFnName(eventData.severity)]({ ...meta, eventData }, 'kafka event.log')
    })

    client.on('event.error', (err: LibrdKafkaError) => {
      log.warn({ ...meta, err }, 'kafka client error')
    })
  }
}

/**
 * Plugin init function.
 * @param params - Kafka configuration.
 */
export function attach(
  this: Microfleet,
  params: GlobalConfig
): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const conf = this.validator.ifError<GlobalConfig>(name, params)
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
