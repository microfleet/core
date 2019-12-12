export type GlobalConfig = {
  'metadata.broker.list': string;
  'group.id': string;
  'enable.auto.commit'?: boolean;
  'auto.commit.interval.ms'?: number;
  [key: string]: any;
}

export type TopicConfig = {
  topicName?: string;
}

export type ProducerGlobalConfig = {
  'batch.num.messages'?: number;
  'queue.buffering.max.ms'?: number;
  [key: string]: any;
}

export type ProducerStreamOptions = {
  pollInterval?: number;
  topic?: string;
  objectMode?: boolean;
}

export type ConsumerStreamOptions = {
  topics?: string[];
  waitInterval?: number;
  fetchSize?: number;
}
