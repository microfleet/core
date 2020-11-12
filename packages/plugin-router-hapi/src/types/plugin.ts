declare module '@microfleet/core-types' {
  export interface ConfigurationOptional {
    'router-hapi': RouterHapiPluginConfig
  }
}

export type RouterHapiPluginConfig = {
  prefix: string
}
