export type KafkaConfig = {
  'metadata.broker.list': string;
  'group.id': string;
  'enable.auto.commit'?: boolean;
  [key: string]: any
}

export type StreamConnectOptions = {
  allTopics?: boolean;
  timeout?: number;
  topics?: string;
}

export type ConsumerStreamOptions = {
  topics?: string | string[];
  waitInterval?: number;
  fetchSize?: number;
  timeout?: number;
  connectOptions?: StreamConnectOptions;
}

export type ProducerStreamOptions = {
  pollInterval?: number;
  autoClose?: boolean;
  objectMode?: boolean;
  topic?: string;
  connectOptions?: StreamConnectOptions;
}

export type TopicConfig = {
  [key: string]: any;
}
