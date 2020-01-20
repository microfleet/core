export type KafkaConfig = {
  'metadata.broker.list': string;
  'group.id': string;
  'enable.auto.commit'?: boolean;
  [key: string]: any
}

export type ConnectOptions = {
  allTopics?: boolean;
  timeout?: number;
  topics?: string | string[] | ((metadata: any) => string[]);
}

export type ConsumerStreamOptions = {
  topics?: string | string[];
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
