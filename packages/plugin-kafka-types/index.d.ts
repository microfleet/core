// Extend types defined in https://github.com/Blizzard/node-rdkafka/blob/master/index.d.ts
import * as kafka from 'node-rdkafka'
import { Microfleet } from '@microfleet/core'
import { KafkaFactory, KafkaConsumerStream } from '@microfleet/plugin-kafka'
import { Writable, Readable } from 'stream'

declare module '@microfleet/core' {
  export interface Microfleet {
    kafka: KafkaFactory;
  }
}

export interface KafkaStreamOpts<T extends kafka.ReadStreamOptions | kafka.WriteStreamOptions, U extends kafka.TopicConfig, Z extends kafka.GlobalConfig> {
  streamOptions: T;
  conf?: Z;
  topicConf?: U;
}

export type ConsumerStreamConfig = KafkaStreamOpts<
  ConsumerStreamOptions,
  kafka.ConsumerTopicConfig,
  kafka.ConsumerGlobalConfig
>

export type ProducerStreamConfig = KafkaStreamOpts<
  kafka.WriteStreamOptions,
  kafka.ProducerTopicConfig,
  kafka.ProducerGlobalConfig
>

export type KafkaStream = kafka.ProducerStream | KafkaConsumerStream
export type StreamOptions<T> =
  T extends KafkaConsumerStream
    ? ConsumerStreamOptions
    : never
  |
  T extends kafka.ProducerStream
    ? kafka.WriteStreamOptions
    : never

export type KafkaClient = kafka.KafkaConsumer | kafka.Producer

/**
 * Arguments passed to the `KafkaConsumer.connect` method
 */
export type ConnectOptions = {
  allTopics?: boolean;
  timeout?: number;
  topic?: string | string[] | ((metadata: kafka.Metadata) => string[]);
}

/**
 * Configuration for the ConsumerStream.
 * @property topics Topics to listen.
 * @property waitInterval Milliseconds to wait between `KafkaConsumer.consume` calls.
 * @property streamAsBatch If true 'data' emitted with array of messages.
 * @property stopOnPartitionsEOF If true stream will exit when all assigned partitions reached last offsets.
 * @property offsetQueryTimeout If timeout for fetching consumer offsets from Kafka.
 * @property offsetCommitTimeout Milliseconds to wait for all offsets to be commited after close started.
 */
export type ConsumerStreamOptions = Omit<kafka.ReadStreamOptions, 'objectMode' | 'autoClose'> & {
  // in orignal type there also function type as a part of this property definition, but there's no place where it could be executed
  topics: kafka.SubscribeTopicList | kafka.SubscribeTopic;
  stopOnPartitionsEOF?: boolean;
  offsetQueryTimeout?: number;
  offsetCommitTimeout?: number;
  autoOffsetStore?: boolean;
}

// export type ConsumerStreamOptions = {
//   topics: string | string[];
//   waitInterval?: number;
//   fetchSize?: number;
//   streamAsBatch?: boolean;
//   stopOnPartitionsEOF?: boolean;
//   offsetQueryTimeout?: number;
//   connectOptions?: kafka.MetadataOptions;
//   offsetCommitTimeout?: number;
//   'enable.auto.offset.store'?: boolean;
// }

/**
 * @property pollInterval Milliseconds to wait between Kafka polls.
 * @property topic Target topic name. Should be set when `objectMode` === true.
 */
export type ProducerStreamOptions = {
  pollInterval?: number;
  autoClose?: boolean;
  objectMode?: boolean;
  topic?: string;
  connectOptions?: ConnectOptions;
}

export { TopicConfig, GlobalConfig } from 'node-rdkafka'


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

    messages: ConsumerStreamMessage[];
    closeAsync(): Promise<void>;
  }

  export interface Client extends EventEmitter {
    _isDisconnecting: boolean;

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
    committedAsync(toppars: any, timeout: any): Promise<kafka.TopicPartitionOffset[]>;
    consumeAsync(count: number): Promise<kafka.Message[]>;

    // REMOVE WHEN FIXED - in original typedef for this method shows single Assignment
    // but the code returns an Array of assignments
    assignments(): Assignment[];
    assign(assignments: Assignment[]): this;
  }
}
