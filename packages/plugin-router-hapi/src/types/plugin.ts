declare module '@microfleet/core' {
  export interface ConfigurationOptional {
    'router-hapi': RouterHapiPluginConfig
  }
}

export type RouterHapiPluginConfig = {
  prefix: string
}
