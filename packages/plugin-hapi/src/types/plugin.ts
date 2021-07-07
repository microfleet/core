import { ServerOptions, Plugin } from '@hapi/hapi'

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
