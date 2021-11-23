// Extend types defined in https://github.com/Blizzard/node-rdkafka/blob/master/index.d.ts
import kafka = require('node-rdkafka')
import { GlobalConfig, TopicConfig, ConsumerGlobalConfig } from 'node-rdkafka'
import { Writable, Readable } from 'stream'
import { EventEmitter } from 'events'

export interface KafkaStreamOpts<T extends kafka.ReadStreamOptions | kafka.WriteStreamOptions, U extends kafka.TopicConfig, Z extends kafka.GlobalConfig> {
  streamOptions: T;
  conf?: Z;
  topicConf?: U;
  meta?: Record<string, any>;
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
 * @property checkTopicExists If true will throw and error if topic does not exists
 */
export type ConsumerStreamOptions = Omit<kafka.ReadStreamOptions, 'objectMode' | 'autoClose' | 'connectOptions' | 'topics'> & {
  // in orignal type there also function type as a part of this property definition, but there's no place where it could be executed
  topics: kafka.SubscribeTopicList | kafka.SubscribeTopic;
  connectOptions?: kafka.MetadataOptions;
  stopOnPartitionsEOF?: boolean;
  offsetQueryTimeout?: number;
  offsetCommitTimeout?: number;
  autoOffsetStore?: boolean;
  checkTopicExists?: boolean;
}

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

declare module 'node-rdkafka' {
  export interface TopicPartitionOffset {
    eof?: boolean
  }

  // event list is hidden by default
  export type KafkaClientEvents = 'disconnected' | 'ready' | 'connection.failure' | 'event.error' | 'event.stats' | 'event.log' | 'event.event' | 'event.throttle';

  export interface LibrdKafkaError {
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    new(e: Error | Record<string, unknown>): LibrdKafkaError;
  }

  export interface ProducerStream extends Writable {
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    new (producer: Producer, conf?: kafka.WriteStreamOptions): ProducerStream;
    producer: Producer;
    connect(metadataOptions?: MetadataOptions): void;
    close(cb?: () => void): void;

    writeAsync(chunk: any, encoding?: string): Promise<void>;
    writeAsync(chunk: any): Promise<void>;
    closeAsync(): Promise<void>;
  }

  export interface ConsumerStream extends Readable {
    (consumer: KafkaConsumer, conf?: kafka.ReadStreamOptions): ConsumerStream;

    consumer: KafkaConsumer;
    connect(options: ConsumerGlobalConfig): void;
    close(cb?: () => void): void;

    messages: Message[];
    closeAsync(): Promise<void>;
  }

  export interface Client<Events extends string> extends EventEmitter {
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    new (c: GlobalConfig, tc: TopicConfig): Client<KafkaClientEvents>;

    _isDisconnecting: boolean;

    // Required on dicsonnection cleanup
    globalConfig: GlobalConfig;
    _client: Client<Events>;
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

  export interface IAdminClient {
    createTopicAsync(topic: NewTopic): Promise<void>;
    createTopicAsync(topic: NewTopic, timeout?: number): Promise<void>;

    deleteTopicAsync(topic: string): Promise<void>;
    deleteTopicAsync(topic: string, timeout?: number): Promise<void>;

    createPartitionsAsync(topic: string, desiredPartitions: number): Promise<void>;
    createPartitionsAsync(topic: string, desiredPartitions: number, timeout?: number): Promise<void>;
  }
}
