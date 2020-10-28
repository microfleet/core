declare module '@microfleet/core' {
  export interface ConfigurationOptional {
    'router-http': RouterHTTPPluginConfig
  }
}

export type RouterHTTPPluginConfig = {
  prefix: string
}
