import * as AMQPTransport from '@microfleet/transport-amqp'

declare module '@microfleet/core' {
  export interface Microfleet {
    amqp: typeof AMQPTransport | null;
  }

  export interface ConfigurationOptional {
    amqp: AMQPPluginConfig;
  }
}

export interface AMQPPlugin {
  amqp: typeof AMQPTransport;
}

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
}

export type AMQPPluginConfig = {
  transport: AMQPPluginTransportConfig;
}
