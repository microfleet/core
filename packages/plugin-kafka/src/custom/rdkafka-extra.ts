/**
 * * Promisify prototypes.
 * * Add async defs.
 * * Provide access for hidden classes
 */
import { promisifyAll } from 'bluebird'
import {
  KafkaConsumer,
  Producer as KafkaProducer,
  ConsumerStream,
  ProducerStream
} from 'node-rdkafka'

/**
 * Library hides ConsumerStream or ProducerStream when using typescript
 * https://blizzard.github.io/node-rdkafka/current/KafkaConsumerStream.html
 * But but we want to create Producer or Consumer before streams
 */
export const KafkaProducerStream: ProducerStream = require('node-rdkafka/lib/producer-stream')
export const KafkaConsumerStream: ConsumerStream = require('node-rdkafka/lib/kafka-consumer-stream')

promisifyAll(KafkaProducerStream.prototype)
promisifyAll(KafkaConsumerStream.prototype)
promisifyAll(KafkaConsumer.prototype)
promisifyAll(KafkaProducer.prototype)

export * from 'node-rdkafka'
