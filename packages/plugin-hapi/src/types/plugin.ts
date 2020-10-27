import { ServerOptions, Server, Plugin } from '@hapi/hapi'

declare module '@microfleet/core' {
  export interface Microfleet {
    hapi: Server
  }

  export interface ConfigurationOptional {
    hapi: HapiPluginConfig
  }
}

export { Server }

export type HapiPlugin = {
  hapi: Server
}

export type HapiPluginConfig = {
  attachSocketio: boolean
  plugins: HapiPluginPluginsConfig
  server: ServerOptions
  views?: any
}

export type HapiPluginPluginsConfig = {
  list: HapiPluginPlugin[]
  options?: any
}

export interface HapiPluginPlugin {
  plugin: string | Plugin<any>
  options?: any
  once?: boolean
}
