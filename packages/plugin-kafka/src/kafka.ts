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
  ProducerGlobalConfig,
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
  createConsumerStream: (
    streamOptions: ConsumerStreamOptions,
    conf?: GlobalConfig,
    topicConf?: TopicConfig
  ) => ConsumerStream
  createProducerStream: (
    streamOptions: ProducerStreamOptions,
    conf?: ProducerGlobalConfig,
    topicConf?: TopicConfig
  ) => ProducerStream
}

export class KafkaFactory implements KafkaPlugin {
  globalConf: GlobalConfig
  constructor(globalConf: GlobalConfig) {
    this.globalConf = globalConf
  }

  createConsumerStream(
    streamOptions: ConsumerStreamOptions,
    conf?: Partial<GlobalConfig>,
    topicConf?: TopicConfig
  ): ConsumerStream {
    const consumerStream = createReadStream(
      { ...this.globalConf, ...conf },
      topicConf,
      streamOptions
    )
    return consumerStream
  }

  createProducerStream(
    streamOptions: ProducerStreamOptions,
    conf?: ProducerGlobalConfig,
    topicConf?: TopicConfig
  ): ProducerStream {
    const producerStream = createWriteStream(
      { ...this.globalConf, ...conf },
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
  return service[name]
}
