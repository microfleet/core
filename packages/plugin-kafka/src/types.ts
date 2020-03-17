import { helpers as ErrorHelpers } from 'common-errors'

/**
 * Global Kafka client configuration
 * See https://github.com/edenhill/librdkafka/blob/v1.2.2/CONFIGURATION.md
 */
export type KafkaConfig = {
  'metadata.broker.list': string;
  'group.id'?: string;
  'enable.auto.commit'?: boolean;
  [key: string]: any
}

/**
 * Arguments passed to the `KafkaConsumer.connect` method
 */
export type ConnectOptions = {
  allTopics?: boolean;
  timeout?: number;
  topic?: string | string[] | ((metadata: any) => string[]);
}

/**
 * Configuration for the ConsumerStream.
 * @property topics Topics to listen.
 * @property waitInterval Milliseconds to wait between `KafkaConsumer.consume` calls.
 * @property streamAsBatch If true 'data' emitted with array of messages.
 * @property stopOnPartitionsEOF If true stream will exit when all assigned partitions reached last offsets.
 * @property offsetQueryTimeout If timeout for fetching consumer offsets from Kafka.
 * @property objectMode
 */
export type ConsumerStreamOptions = {
  topics: string | string[];
  waitInterval?: number;
  fetchSize?: number;
  streamAsBatch?: boolean;
  stopOnPartitionsEOF?: boolean;
  offsetQueryTimeout?: number;
  objectMode?: boolean;
  connectOptions?: ConnectOptions;
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

/**
 * Topic configuration
 * See https://github.com/edenhill/librdkafka/blob/v1.2.2/CONFIGURATION.md
 */
export type TopicConfig = {
  [key: string]: any;
}

// Types for objects returned from `node-rdkafka`
export type BrokerInfo = {
  id: number;
  host: string;
  port: number;
}

export type PartitionInfo = {
  id: number;
  isrs: number[];
  leader: number;
  replicas: number[];
}

export type TopicInfo = {
  name: string
  partitions: PartitionInfo[]
}

export type Metadata = {
  orig_broker_id: number;
  orig_borker_name: string;
  topics: TopicInfo[];
  brokers: BrokerInfo[];
}

export const TopicNotFoundError = ErrorHelpers.generateClass('TopicNotFoundError', {
  args: ['message', 'topics'],
})

export const TopicReadTimeoutError = ErrorHelpers.generateClass('TopicReadTimeoutError', {
  args: ['message'],
})
