import { HapiPluginConfig, Server } from '@microfleet/plugin-hapi'

declare module '@microfleet/core' {
  export interface Microfleet {
    http: Server // | something else
  }

  export interface ConfigurationOptional {
    http: HTTPPluginConfig
  }
}

export type HTTPPlugin = {
  http: Server // | something else
}

export type HTTPPluginConfig = {
  server: HTTPPluginCommonConfig & (HTTPPluginHapiConfig /* | something else */)
}

export type HTTPPluginCommonConfig = {
  attachSocketio: boolean
  port: number
  host: string
}

export type HTTPPluginHapiConfig = {
  handler: 'hapi'
  handlerConfig: Pick<HapiPluginConfig, "plugins" | "server" | "views">
}
