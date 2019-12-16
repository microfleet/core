import { KafkaConfig } from './types'

import { Microfleet } from '@microfleet/core'

import { Consumer } from './stream/consumer'
import { Producer } from './stream/producer'

export class KafkaFactory {
  globalConf: KafkaConfig
  service: Microfleet

  constructor(service: Microfleet, globalConf: KafkaConfig) {
    this.globalConf = globalConf
    this.service = service
  }

  createConsumer(): Consumer {
    return new Consumer(this.service, this.globalConf)
  }

  createProducer(): Producer {
    return new Producer(this.service, this.globalConf)
  }
}
