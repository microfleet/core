export type GlobalConfig = KafkaConfig & {
  connectTimeout: number;
}

export type KafkaConfig = {
  'metadata.broker.list': string;
  'group.id': string;
  'enable.auto.commit'?: boolean;
  [key: string]: any;
}

export type TopicConfig = {
  'auto.offset.reset': string,
  [key: string]: any;
}

export type ConsumerConfig = {
  commitTimeout: number
  topicConfig?: TopicConfig;
  stream: ConsumerStreamOptions;
  connection: { // additional options
    'group.id': string
    [key:string]: any
  }
}

export type ProducerConfig = {
  deliveryTimeout: number
  topicConfig?: TopicConfig
  stream?: ProducerStreamOptions
  connection?: { // additional options
    [key:string]: any
  }
}

export type ConsumerStreamOptions = {
  topics?: string | string[];
  waitInterval?: number;
  fetchSize?: number;
  timeout?: number;
  topics?: any; // fixme
}

export type ProducerStreamOptions = {
  pollInterval?: number;
  autoClose?: boolean;
}

export type TopicConfig = {
  [key: string]: any
}
