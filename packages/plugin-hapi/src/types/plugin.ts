import { ServerOptions, Plugin } from '@hapi/hapi'

export type HapiPluginConfig = {
  attachSocketio: boolean
  plugins: HapiPluginPluginsConfig
  server: ServerOptions
  views?: any
}

export type HapiPluginPluginsConfig = {
  list: HapiPlugin[]
  options?: any
}

export interface HapiPlugin<T = any> {
  plugin: string | Plugin<T>
  options?: any
  once?: boolean
}
