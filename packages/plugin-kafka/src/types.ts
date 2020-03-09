import { helpers as ErrorHelpers } from 'common-errors'

export type KafkaConfig = {
  'metadata.broker.list': string;
  'group.id'?: string;
  'enable.auto.commit'?: boolean;
  [key: string]: any;
}

export type ConnectOptions = {
  allTopics?: boolean;
  timeout?: number;
  topic?: string | string[] | ((metadata: any) => string[]);
}

export type ConsumerStreamOptions = {
  topics: string | string[];
  waitInterval?: number;
  fetchSize?: number;
  streamAsBatch?: boolean;
  connectOptions?: ConnectOptions;
}

export type ProducerStreamOptions = {
  pollInterval?: number;
  autoClose?: boolean;
  objectMode?: boolean;
  topic?: string;
  connectOptions?: ConnectOptions;
}

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
