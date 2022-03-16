import type { Configuration } from '@microfleet/transport-amqp'

type HostConfig = {
  host: string,
  port: number;
}

export type AMQPPluginTransportConnectionConfig = {
  host: string | string[] | HostConfig[];
  port: number;
}

export type AMQPPluginConfig = {
  transport: Configuration
}
