import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginTypes, LoggerPlugin, PluginInterface } from '@microfleet/core'
// import retry = require('bluebird-retry')
import * as Kafka from 'node-rdkafka'

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0
export const name = 'kafka'
export const type = PluginTypes.transport

export type TopicConfig = {
  topicName: string;
}

type GlobalConfig = {
  'metadata.broker.list': string;
}

type Config = {
  globalConf: GlobalConfig;
  topicConf?: TopicConfig;
}

/**
 * Defines service extension
 */
export interface KafkaPlugin {
  globalConf: GlobalConfig
  createConsumer: (topicConf?: TopicConfig) => Kafka.KafkaConsumer
  createProducer: (topicConf?: TopicConfig) => Kafka.Producer
}

export class KafkaFactory implements KafkaPlugin {
  globalConf: GlobalConfig
  constructor(globalConf: GlobalConfig) {
    this.globalConf = globalConf
  }

  createConsumer(topicConf?: TopicConfig): Kafka.KafkaConsumer {
    return new Kafka.KafkaConsumer(this.globalConf, topicConf)
  }

  createProducer(topicConf?: TopicConfig): Kafka.Producer {
    return new Kafka.Producer(this.globalConf, topicConf)
  }
}

/**
 * Defines closure
 */
const startupHandlers = (
  service: Microfleet,
  globalConf: GlobalConfig
): PluginInterface => ({
  async connect() {
    assert(!service[name], 'kafka has already been initialized')

    service[name] = new KafkaFactory(globalConf)
    return service[name]
  },

  async close() {
    service[name] = null
    service.emit(`plugin:close:${name}`, service[name])
  },
})

export function attach(
  this: Microfleet & LoggerPlugin,
  params: Config
) {
  const service = this

  assert(service.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(service.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  service.validator.addLocation(resolve(__dirname, '../schemas'))

  const globalConfig: GlobalConfig = service.ifError(name, params)

  return startupHandlers(service, globalConfig)
}
