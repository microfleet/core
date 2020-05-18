import {
  ReadStreamOptions,
  WriteStreamOptions,
  TopicConfig, GlobalConfig,
  ConsumerTopicConfig, ConsumerGlobalConfig,
  ProducerTopicConfig, ProducerGlobalConfig,
  ProducerStream, KafkaConsumer,
  Producer, Metadata,
  SubscribeTopic, SubscribeTopicList,
  MetadataOptions,
} from './rdkafka-extra'

import { KafkaConsumerStream } from './consumer-stream'

export interface KafkaStreamOpts<T extends ReadStreamOptions | WriteStreamOptions, U extends TopicConfig, Z extends GlobalConfig> {
  streamOptions: T;
  conf?: Z;
  topicConf?: U;
}

export type ConsumerStreamConfig = KafkaStreamOpts<
  ConsumerStreamOptions,
  ConsumerTopicConfig,
  ConsumerGlobalConfig
>

export type ProducerStreamConfig = KafkaStreamOpts<
  WriteStreamOptions,
  ProducerTopicConfig,
  ProducerGlobalConfig
>

export type KafkaStream = ProducerStream | KafkaConsumerStream
export type StreamOptions<T> =
  T extends KafkaConsumerStream
    ? ConsumerStreamOptions
    : never
  |
  T extends ProducerStream
    ? WriteStreamOptions
    : never

export type KafkaClient = KafkaConsumer | Producer

/**
 * Arguments passed to the `KafkaConsumer.connect` method
 */
export type ConnectOptions = {
  allTopics?: boolean;
  timeout?: number;
  topic?: string | string[] | ((metadata: Metadata) => string[]);
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
export type ConsumerStreamOptions = Omit<ReadStreamOptions, 'objectMode' | 'autoClose' | 'connectOptions' | 'topics'> & {
  // in orignal type there also function type as a part of this property definition, but there's no place where it could be executed
  topics: SubscribeTopicList | SubscribeTopic;
  connectOptions?: MetadataOptions;
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
