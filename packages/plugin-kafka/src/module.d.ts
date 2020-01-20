import { Client, Producer, KafkaConsumer, ProducerStream, ConsumerStream } from 'node-rdkafka'
import { ConnectOptions } from './types'

declare module 'node-rdkafka' {
  interface ProducerStream extends Writable {
    closeAsync(): Promise<void>
  }

  interface ConsumerStream extends Readable {
    closeAsync(): Promise<void>
  }

  interface Client extends NodeJS.EventEmitter {
    connectAsync(metadataOptions: ConnectOptions): Promise<this>
    disconnectAsync(): Promise<this>
    disconnectAsync(timeout: number): Promise<this>
  }
}
