export type AMQPPluginTransportConnectionConfig = {
  host: string;
  port: number;
}

export type AMQPPluginTransportConfig = {
  connection: AMQPPluginTransportConnectionConfig;
  bindPersistantQueueToHeadersExchange: boolean;
  queue: string;
  onComplete: CallableFunction;
  neck: number;
  timeout: number;
}

export type AMQPPluginConfig = {
  transport: AMQPPluginTransportConfig;
}
