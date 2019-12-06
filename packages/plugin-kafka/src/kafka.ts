import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginTypes, LoggerPlugin } from '@microfleet/core'
import {
  ProducerStream,
  ConsumerStream,
  createWriteStream,
  createReadStream,
} from 'node-rdkafka'

import {
  GlobalConfig,
  TopicConfig,
  ProducerStreamOptions,
  ConsumerStreamOptions,
} from './types'

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
  globalConf: GlobalConfig
  createConsumer: (
    streamOptions: ConsumerStreamOptions,
    globalConf?: GlobalConfig,
    topicConf?: TopicConfig
  ) => ConsumerStream
  createProducer: (
    streamOptions: ProducerStreamOptions,
    globalConf?: GlobalConfig,
    topicConf?: TopicConfig
  ) => ProducerStream
}

export class KafkaFactory implements KafkaPlugin {
  globalConf: GlobalConfig
  constructor(globalConf: GlobalConfig) {
    this.globalConf = globalConf
  }

  createConsumer(
    streamOptions: ConsumerStreamOptions,
    globalConf?: Partial<GlobalConfig>,
    topicConf?: TopicConfig
  ): ConsumerStream {
    const consumerStream = createReadStream(
      { ...this.globalConf, ...globalConf },
      topicConf,
      streamOptions
    )
    return consumerStream
  }

  createProducer(
    streamOptions: ProducerStreamOptions,
    globalConf?: Partial<GlobalConfig>,
    topicConf?: TopicConfig
  ): ProducerStream {
    const producerStream = createWriteStream(
      { ...this.globalConf, ...globalConf },
      topicConf,
      streamOptions
    )
    return producerStream
  }
}

/**
 * Plugin init function.
 * @param params - Kafka configuration.
 */
export function attach(
  this: Microfleet & LoggerPlugin,
  params: GlobalConfig
) {
  const service = this

  assert(service.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(service.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  service.validator.addLocation(resolve(__dirname, '../schemas'))

  const conf: GlobalConfig = service.ifError(name, params)

  service[name] = new KafkaFactory(conf)
}
