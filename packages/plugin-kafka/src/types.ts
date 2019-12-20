export type GlobalConfig = KafkaConfig & {
  connectTimeout: number;
}

export type KafkaConfig = {
  'metadata.broker.list': string;
  'group.id': string;
  'enable.auto.commit'?: boolean;
  [key: string]: any
}

export type ConsumerStreamOptions = {
  topics?: string | string[];
  waitInterval?: number;
  fetchSize?: number;
  timeout?: number;
}

export type ProducerStreamOptions = {
  pollInterval?: number;
  autoClose?: boolean;
  objectMode?: boolean;
  topic?: string;
}

export type TopicConfig = {
  [key: string]: any;
}
