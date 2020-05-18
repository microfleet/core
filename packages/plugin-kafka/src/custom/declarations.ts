import { Writable, Readable } from 'stream'
import { EventEmitter } from 'events'

// Extend types defined in https://github.com/Blizzard/node-rdkafka/blob/master/index.d.ts
import * as kafka from 'node-rdkafka'

import { KafkaFactory } from '../kafka'
import { GlobalConfig, TopicConfig, ConsumerGlobalConfig } from './rdkafka-extra'

declare module '@microfleet/core' {
  export interface Microfleet {
    kafka: KafkaFactory;
  }
}

declare module 'node-rdkafka' {
  // event list is hidden by default
  export type KafkaClientEvents = 'disconnected' | 'ready' | 'connection.failure' | 'event.error' | 'event.stats' | 'event.log' | 'event.event' | 'event.throttle';

  export interface LibrdKafkaError {
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    new (e: Error | object): LibrdKafkaError;
  }

  interface ProducerStream extends Writable {
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    new (producer: Producer, conf?: kafka.WriteStreamOptions): ProducerStream;
    producer: Producer;
    connect(metadataOptions?: MetadataOptions): void;
    close(cb?: () => void): void;

    writeAsync(chunk: any, encoding?: string): Promise<void>;
    writeAsync(chunk: any): Promise<void>;
    closeAsync(): Promise<void>;
  }

  interface ConsumerStream extends Readable {
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    new (consumer: KafkaConsumer, conf?: kafka.ReadStreamOptions): ConsumerStream;

    consumer: KafkaConsumer;
    connect(options: ConsumerGlobalConfig): void;
    close(cb?: () => void): void;

    messages: kafka.Message[];
    closeAsync(): Promise<void>;
  }

  export interface Client<Events extends string> extends EventEmitter {
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    new (c: GlobalConfig, tc: TopicConfig): Client<KafkaClientEvents>;

    _isDisconnecting: boolean;

    // Required on dicsonnection cleanup
    globalConfig: GlobalConfig;
    _client: Client<KafkaClientEvents>;
    _metadata: Metadata | null | undefined;

    connectAsync(metadataOptions: MetadataOptions): Promise<Metadata>;
    disconnectAsync(): Promise<this>;
    disconnectAsync(timeout: number): Promise<this>;

    // https://github.com/Blizzard/node-rdkafka/blob/master/lib/client.js#L366
    queryWatermarkOffsetsAsync(topic: string, partition: number, timeout: number): Promise<kafka.WatermarkOffsets>;

    // https://github.com/Blizzard/node-rdkafka/blob/master/lib/client.js#L329
    getMetadataAsync(metadataOptions: MetadataOptions): Promise<Metadata>;
  }

  export interface KafkaConsumer {
    // https://github.com/Blizzard/node-rdkafka/blob/master/lib/kafka-consumer.js#L176
    committedAsync(toppars: TopicPartition[], timeout: number): Promise<kafka.TopicPartitionOffset[]>;
    consumeAsync(count: number): Promise<kafka.Message[]>;
  }

  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  export interface IAdminClient {
    createTopicAsync(topic: NewTopic): Promise<void>;
    createTopicAsync(topic: NewTopic, timeout?: number): Promise<void>;

    deleteTopicAsync(topic: string): Promise<void>;
    deleteTopicAsync(topic: string, timeout?: number): Promise<void>;

    createPartitionsAsync(topic: string, desiredPartitions: number): Promise<void>;
    createPartitionsAsync(topic: string, desiredPartitions: number, timeout?: number): Promise<void>;
  }
}
