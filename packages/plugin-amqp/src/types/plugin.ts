type HostConfig = {
  host: string,
  port: number;
}
export type AMQPPluginTransportConnectionConfig = {
  host: string | string[] | HostConfig[];
  port: number;
}

export type AMQPPluginTransportConfig = {
  connection: AMQPPluginTransportConnectionConfig;
  bindPersistantQueueToHeadersExchange: boolean;
  queue: string;
  onComplete: CallableFunction;
  neck: number;
  timeout: number;
  exchange: string;
}

export type AMQPPluginConfig = {
  transport: AMQPPluginTransportConfig;
}
