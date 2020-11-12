import { HapiPluginConfig } from '@microfleet/plugin-hapi'

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
