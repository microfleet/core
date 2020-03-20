import { promisifyAll } from 'bluebird'

import {
  KafkaConsumer,
  Producer,
} from 'node-rdkafka'

export * from 'node-rdkafka'

/**
 * Library hides ConsumerStream or ProducerStream when using typescript
 * https://blizzard.github.io/node-rdkafka/current/KafkaConsumerStream.html
 * But but we want to create Producer or Consumer before streams
 */
export const KafkaProducerStream = require('node-rdkafka/lib/producer-stream')
export const KafkaConsumerStream = require('node-rdkafka/lib/kafka-consumer-stream')

promisifyAll(Producer.prototype)
promisifyAll(KafkaConsumer.prototype)

// Assuming that `required` libs are Classes
// @ts-ignore
promisifyAll(KafkaConsumerStream.prototype)
// @ts-ignore
promisifyAll(KafkaProducerStream.prototype)
