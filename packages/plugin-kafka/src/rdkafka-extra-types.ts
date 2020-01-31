import { Readable, Writable } from 'stream'
import { EventEmitter } from 'events'
import { ConnectOptions } from './types'

declare module 'node-rdkafka' {
  interface ProducerStream extends Writable {
    closeAsync(): Promise<void>
    writeAsync(chunk: any, cb?: (e: Error) => void): Promise<void>
  }

  interface ConsumerStream extends Readable {
    closeAsync(): Promise<void>
  }

  interface Client extends EventEmitter {
    connectAsync(metadataOptions: ConnectOptions): Promise<this>
    disconnectAsync(): Promise<this>
    disconnectAsync(timeout: number): Promise<this>
  }
}
