/* eslint-disable @typescript-eslint/no-var-requires */
import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError, helpers as ErrorHelpers } from 'common-errors'
import { LoggerPlugin } from '@microfleet/plugin-logger'
import { Microfleet, PluginTypes, PluginInterface, ValidatorPlugin } from '@microfleet/core'
import { map } from 'bluebird'

import {
  KafkaConsumer,
  Producer as KafkaProducer,
  KafkaProducerStream,
  ConsumerStreamMessage,
  Client as KafkaClient,
  LibrdKafkaError,
} from './custom/rdkafka-extra'

import {
  TopicConfig,
  GlobalConfig,
  ConsumerStreamConfig,
  ProducerStreamConfig,
  StreamOptions,
  KafkaStream,
} from '@microfleet/plugin-kafka-types'

import { getLogFnName, topicExists } from './util'
import { KafkaConsumerStream, OffsetCommitError, UncommittedOffsetsError } from './custom/consumer-stream'

export {
  KafkaConsumer, KafkaProducerStream, KafkaConsumerStream,
  ConsumerStreamMessage, OffsetCommitError, UncommittedOffsetsError,
  LibrdKafkaError
}

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0
export const name = 'kafka'
export const type = PluginTypes.transport

export const TopicNotFoundError = ErrorHelpers.generateClass('TopicNotFoundError', {
  args: ['message', 'topics'],
})

export * from '@microfleet/plugin-kafka-types'

export class KafkaFactory {
  rdKafkaConfig: GlobalConfig
  private streams: Set<KafkaStream>
  private connections: Set<KafkaClient>
  private service: Microfleet & LoggerPlugin

  constructor(service: Microfleet & LoggerPlugin, config: GlobalConfig) {
    this.rdKafkaConfig = config
    this.streams = new Set<KafkaStream>()
    this.connections = new Set<KafkaClient>()
    this.service = service
  }

  async createConsumerStream(opts: ConsumerStreamConfig): Promise<KafkaConsumerStream> {
    const topics = opts.streamOptions.topics
    const consumerConfig: ConsumerStreamConfig['conf'] = {
      ...opts.conf,
      // eslint-disable-next-line @typescript-eslint/camelcase
      offset_commit_cb: opts.conf?.offset_commit_cb || true,
      // eslint-disable-next-line @typescript-eslint/camelcase
      rebalance_cb: opts.conf?.rebalance_cb || true,
      'enable.auto.offset.store': false,
    }

    // pass on original value
    opts.streamOptions['enable.auto.offset.store'] = opts.conf?.['enable.auto.offset.store']

    const consumerTopicConfig: ConsumerStreamConfig['topicConf'] = { ...opts.topicConf }
    const consumer = this.createClient(KafkaConsumer, consumerConfig, consumerTopicConfig)

    this.attachClientLogger(consumer, { topics, type: 'consumer' })

    const brokerMeta = await consumer.connectAsync(opts.streamOptions.connectOptions || {})
    if (!topicExists(brokerMeta.topics, topics)) {
      throw new TopicNotFoundError('Missing consumer topic', topics)
    }

    return this.createStream(KafkaConsumerStream, consumer, opts.streamOptions)
  }

  async createProducerStream(opts: ProducerStreamConfig): Promise<KafkaProducerStream> {
    const producer = this.createClient(KafkaProducer, opts.conf, opts.topicConf)

    this.attachClientLogger(producer, { type: 'producer', topic: opts.streamOptions.topic })

    await producer.connectAsync(opts.streamOptions.connectOptions || {})
    return this.createStream(KafkaProducerStream, producer, opts.streamOptions)
  }

  async close() {
    // Some connections will be already closed by streams
    await map(this.streams.values(), stream => stream.closeAsync())
    // Close other connections
    await map(this.connections.values(), connection => connection.disconnectAsync())
  }

  getStreams() {
    return this.streams
  }

  getConnections() {
    return this.connections
  }

  private createStream<T extends KafkaStream, U>(
    streamClass: new (c: U, o: StreamOptions<T>, log?: LoggerPlugin['log']) => T,
    client: U,
    opts: StreamOptions<T>
  ): T {
    const stream = new streamClass(client, opts, this.service.log)
    const { streams, service: { log } } = this

    streams.add(stream)
    stream.on('close', function close(this: T) {
      streams.delete(this)
      log.info('closed stream')
    })

    return stream
  }

  private createClient<T extends KafkaClient, U extends GlobalConfig, Z extends TopicConfig>(
    clientClass: new (c?: U, tc?: Z) => T,
    conf?: U,
    topicConf?: Z
  ): T {
    const config: U = { ...this.rdKafkaConfig as U, ...conf }
    const client = new clientClass(config, topicConf)

    return client
  }

  private attachClientLogger(client: KafkaClient, meta: any = {}) {
    const { log } = this.service
    const { connections } = this

    client.on('ready', function connected(this: KafkaClient) {
      log.info(meta, 'client ready')
      connections.add(this)
    })

    client.on('disconnected', function disconnected(this: KafkaClient) {
      log.info(meta, 'client disconnected')
      connections.delete(this)
    })

    client.on('event.log', (eventData: any) => {
      log[getLogFnName(eventData.severity)]({ ...meta, eventData }, 'kafka event.log')
    })

    client.on('event.error', (err: Error) => {
      log.warn({ ...meta, err }, 'kafka client error')
    })
  }
}

/**
 * Plugin init function.
 * @param params - Kafka configuration.
 */
export function attach(
  this: Microfleet & LoggerPlugin & ValidatorPlugin,
  params: GlobalConfig
): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const conf: GlobalConfig = this.validator.ifError(name, params)
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
