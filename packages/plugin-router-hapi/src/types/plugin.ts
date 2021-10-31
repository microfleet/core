import { ServerRoute } from '@hapi/hapi'

declare module '@microfleet/core-types' {
  export interface ConfigurationOptional {
    routerHapi: RouterHapiPluginConfig
  }
}

declare module '@microfleet/plugin-router' {
  export interface TransportOptionsHandlers {
    hapi?: Partial<ServerRoute>
  }
}

export type RouterHapiPluginConfig = {
  prefix: string
}
