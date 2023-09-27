export type RouterAMQPPluginRetryConfig = {
  enabled: boolean;
  min: number;
  max: number;
  maxRetries: number;
  factor: number;
  queue: string;
  predicate: CallableFunction;
}

export type RouterAMQPPluginConfig = {
  prefix: string;
  autoDeserialize: boolean;
  retry: RouterAMQPPluginRetryConfig;
  multiAckEvery: number;
  multiAckAfter: number;
}
