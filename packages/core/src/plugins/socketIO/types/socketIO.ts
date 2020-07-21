export type SocketIORouterConfig = {
  enabled: boolean;
}

export type SocketIOServiceAdapterConfig = {
  name: string;
  options: any;
}

export type SocketIOServiceConfig = {
  adapter: SocketIOServiceAdapterConfig;
}

export type SocketIOConfig = {
  router: SocketIORouterConfig;
  options: SocketIOServiceConfig;
}