/**
 * * Promisify prototypes.
 * * Add async defs.
 * * Provide access for hidden classes
 * * Add some sugar.
 */

import { EventEmitter } from 'events'
import { Readable, Writable } from 'stream'
import { promisifyAll } from 'bluebird'

import { ConnectOptions, Metadata } from './types'

/**
 * Library hides consumer when using typescript
 * https://blizzard.github.io/node-rdkafka/current/KafkaConsumerStream.html
 * But direct consumer creation was requested in
 * https://github.com/microfleet/core/pull/362#discussion_r367773758
 */
export const kConsumerStream = require('node-rdkafka/lib/kafka-consumer-stream')
export const kProducerStream = require('node-rdkafka/lib/producer-stream')

promisifyAll(kConsumerStream.prototype)
promisifyAll(kProducerStream.prototype)

import {
  KafkaConsumer,
  Producer as KafkaProducer,
  ProducerStream,
  ConsumerStream,
  Client as KafkaClient,
} from 'node-rdkafka'

export { KafkaConsumer, KafkaProducer, ProducerStream, ConsumerStream, KafkaClient }

promisifyAll(KafkaConsumer.prototype)
promisifyAll(KafkaProducer.prototype)

kConsumerStream.prototype.allMessagesRead = async function allMessagesRead(
  this: ConsumerStream, operationTimeout: number
): Promise<boolean> {
  const { consumer } = this
  const commitedOffsets = await consumer.committedAsync(consumer.assignments(), operationTimeout)

  const serverOffsetPromises = commitedOffsets.map(
    async (position: any) => {
      const watermark = await consumer.queryWatermarkOffsetsAsync(
        position.topic,
        position.partition,
        operationTimeout
      )

      return position.offset === watermark.highOffset
    }
  )

  const serverOffsets = await Promise.all(serverOffsetPromises)
  return !serverOffsets.includes(false)
}

// We're extending types defined in https://github.com/Blizzard/node-rdkafka/blob/master/index.d.ts
// So types should be same
declare module 'node-rdkafka' {
  interface ProducerStream extends Writable {
    writeAsync(chunk: any, encoding?: string): Promise<null | undefined>
    writeAsync(chunk: any): Promise<null | undefined>

    closeAsync(): Promise<void>
  }

  interface ConsumerStream extends Readable {
    closeAsync(): Promise<void>
    /**
     * Checks whether local offsets equal to remote offsets for topics that stream listens.
     * @returns boolean - `true` If Reached EOF for all assigned topic partitions
     */
    allMessagesRead(timeout: number): Promise<boolean>
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
