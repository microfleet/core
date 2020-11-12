declare module '@microfleet/core-types' {
  export interface ConfigurationOptional {
    'router-http': RouterHTTPPluginConfig
  }
}

export type RouterHTTPPluginConfig = {
  prefix: string
}
