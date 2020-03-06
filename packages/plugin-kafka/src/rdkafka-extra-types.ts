import { EventEmitter } from 'events'
import { Readable, Writable } from 'stream'

import { ConnectOptions } from './types'

// We're extending types defined in https://github.com/Blizzard/node-rdkafka/blob/master/index.d.ts
// So types should be same
declare module 'node-rdkafka' {
  interface ProducerStream extends Writable {
    closeAsync(): Promise<void>
  }

  interface ConsumerStream extends Readable {
    closeAsync(): Promise<void>
  }

  interface Client extends EventEmitter {
    connectAsync(metadataOptions: ConnectOptions): Promise<this>
    disconnectAsync(): Promise<this>
    disconnectAsync(timeout: number): Promise<this>

    // https://github.com/Blizzard/node-rdkafka/blob/master/lib/client.js#L366
    queryWatermarkOffsetsAsync(topic: string, partition: number, timeout: number): Promise<any>
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
