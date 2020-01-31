import { EventEmitter } from 'events'
import { ConnectOptions } from './types'

declare module 'node-rdkafka' {
  interface ProducerStream extends WritableStream {
    closeAsync(): Promise<void>
    writeAsync(chunk: any, cb?: (e: Error) => void): Promise<void>
  }

  interface ConsumerStream extends ReadableStream {
    closeAsync(): Promise<void>
  }

  interface Client extends EventEmitter {
    connectAsync(metadataOptions: ConnectOptions): Promise<this>
    disconnectAsync(): Promise<this>
    disconnectAsync(timeout: number): Promise<this>
  }
}
