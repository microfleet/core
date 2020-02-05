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
  }
}
