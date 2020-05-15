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
  LibrdKafkaError as LibrdKafkaError,
  Client,
  KafkaClientEvents,
} from 'node-rdkafka'

export * from 'node-rdkafka'

/**
 * Library hides ConsumerStream or ProducerStream when using typescript
 * https://blizzard.github.io/node-rdkafka/current/KafkaConsumerStream.html
 * But but we want to create Producer or Consumer before streams
 */
export const KafkaProducerStream = require('node-rdkafka/lib/producer-stream') as ProducerStream
export const KafkaConsumerStream = require('node-rdkafka/lib/kafka-consumer-stream') as ConsumerStream
export const KafkaClient = require('node-rdkafka/lib/client') as Client<KafkaClientEvents>
export const LibrdKafkaErrorClass = require('node-rdkafka/lib/error') as LibrdKafkaError

export type KafkaProducerStream = ProducerStream
export type KafkaConsumerStream = ConsumerStream
export type LibrdKafkaErrorClass = LibrdKafkaError
export type KafkaClient = Client<KafkaClientEvents>

promisifyAll(KafkaProducerStream.prototype)
promisifyAll(KafkaConsumerStream.prototype)
promisifyAll(KafkaConsumer.prototype)
promisifyAll(KafkaProducer.prototype)
