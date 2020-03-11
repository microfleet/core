/**
 * * Promisify prototypes.
 * * Add async defs.
 * * Provide access for hidden classes
 */
import { EventEmitter } from 'events'
import { Writable } from 'stream'
import { promisifyAll } from 'bluebird'
import { ConnectOptions, Metadata } from './types'
import {
  KafkaConsumer,
  Producer as KafkaProducer,
  ProducerStream,
  ConsumerStream,
  Client as KafkaClient,
  ConsumerStreamMessage,
} from 'node-rdkafka'

export { KafkaConsumer, KafkaProducer, ProducerStream, ConsumerStream, ConsumerStreamMessage, KafkaClient }
/**
 * Library hides ConsumerStream or ProducerStream when using typescript
 * https://blizzard.github.io/node-rdkafka/current/KafkaConsumerStream.html
 * But but we want to create Producer or Consumer before streams
 */
export const kProducerStream = require('node-rdkafka/lib/producer-stream')

promisifyAll(kProducerStream.prototype)
promisifyAll(KafkaConsumer.prototype)
promisifyAll(KafkaProducer.prototype)

// Extend types defined in https://github.com/Blizzard/node-rdkafka/blob/master/index.d.ts
declare module 'node-rdkafka' {
  interface ProducerStream extends Writable {
    writeAsync(chunk: any, encoding?: string): Promise<null | undefined>
    writeAsync(chunk: any): Promise<null | undefined>

    closeAsync(): Promise<void>
  }

  interface Client extends EventEmitter {
    connectAsync(metadataOptions: ConnectOptions): Promise<Metadata>
    disconnectAsync(): Promise<this>
    disconnectAsync(timeout: number): Promise<this>

    // https://github.com/Blizzard/node-rdkafka/blob/master/lib/client.js#L366
    queryWatermarkOffsetsAsync(topic: string, partition: number, timeout: number): Promise<any>

    // https://github.com/Blizzard/node-rdkafka/blob/master/lib/client.js#L329
    getMetadataAsync(metadataOptions: ConnectOptions): Promise<Metadata>
  }

  interface KafkaConsumer extends Client {
    // https://github.com/Blizzard/node-rdkafka/blob/master/lib/kafka-consumer.js#L176
    committedAsync(toppars: any, timeout: any): Promise<TopicPartition[]>
  }

  interface TopicPartition {
    topic: string
    partition: number
    offset: string | number
  }
}
