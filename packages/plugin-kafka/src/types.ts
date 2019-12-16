
// https://docs.confluent.io/current/installation/configuration/producer-configs.html
// https://docs.confluent.io/current/installation/configuration/consumer-configs.html
// https://docs.confluent.io/current/installation/configuration/topic-configs.html

export type KafkaConfig = {
  connection: ConnectionConfig
  producer?: ProducerConfig
  consumer?: ConsumerConfig
}

export type ConnectionConfig = {
  'metadata.broker.list': string
  [key: string]: any
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
  autoClose?: boolean;
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
