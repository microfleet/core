declare module '@microfleet/core-types' {
  export interface ConfigurationOptional {
    routerHapi: RouterHapiPluginConfig
  }
}

export type RouterHapiPluginConfig = {
  prefix: string
}
