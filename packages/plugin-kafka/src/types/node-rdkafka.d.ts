// Extend types defined in https://github.com/Blizzard/node-rdkafka/blob/master/index.d.ts
export * from 'node-rdkafka'

declare module 'node-rdkafka' {
  export interface ProducerStream {
    constructor(c: Client, o: StreamOptions<ProducerStream>): ProducerStream
    writeAsync(chunk: any, encoding?: string): Promise<null | undefined>
    writeAsync(chunk: any): Promise<null | undefined>

    closeAsync(): Promise<void>
  }

  export interface ConsumerStream {
    messages: ConsumerStreamMessage[] | ConsumerStreamMessage[][]
    consumer: KafkaConsumer
    constructor(c: Client, o: StreamOptions<ConsumerStream>): ConsumerStream
    closeAsync(): Promise<void>
  }

  export interface Client {
    connectAsync(metadataOptions: ConnectOptions): Promise<Metadata>
    disconnectAsync(): Promise<this>
    disconnectAsync(timeout: number): Promise<this>

    // https://github.com/Blizzard/node-rdkafka/blob/master/lib/client.js#L366
    queryWatermarkOffsetsAsync(topic: string, partition: number, timeout: number): Promise<any>

    // https://github.com/Blizzard/node-rdkafka/blob/master/lib/client.js#L329
    getMetadataAsync(metadataOptions: ConnectOptions): Promise<Metadata>
  }

  export interface KafkaConsumer {
    // https://github.com/Blizzard/node-rdkafka/blob/master/lib/kafka-consumer.js#L176
    committedAsync(toppars: any, timeout: any): Promise<TopicPartition[]>
  }

  interface TopicPartition {
    topic: string
    partition: number
    offset: string | number
  }
}
