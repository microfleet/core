/* eslint-disable @typescript-eslint/no-var-requires */
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
  ProducerStream,
  LibrdKafkaError as LibrdKafkaError
} from 'node-rdkafka'

export * from 'node-rdkafka'

/**
 * Library hides ConsumerStream or ProducerStream when using typescript
 * https://blizzard.github.io/node-rdkafka/current/KafkaConsumerStream.html
 * But but we want to create Producer or Consumer before streams
 */
export const origProducerStream: ProducerStream = require('node-rdkafka/lib/producer-stream')
export const origConsumerStream: ConsumerStream = require('node-rdkafka/lib/kafka-consumer-stream')
export const LibrdKafkaErrorClass: LibrdKafkaError = require('node-rdkafka/lib/error')

// simple hack to merge TypeScript type and hidden class
export class KafkaProducerStream extends origProducerStream {}
export class KafkaConsumerStream extends origConsumerStream {}

promisifyAll(origProducerStream.prototype)
promisifyAll(origConsumerStream.prototype)
promisifyAll(KafkaConsumer.prototype)
promisifyAll(KafkaProducer.prototype)
