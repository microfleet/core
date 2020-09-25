import { Server, ServerOptions } from 'socket.io'

declare module '@microfleet/core' {
  export interface Microfleet {
    amqp: SocketIOPlugin | null;
  }

  export interface ConfigurationOptional {
    sokcetio: SocketIOPluginConfig;
  }
}

export interface SocketIOPlugin {
  socketio: Server;
}

export type SocketIOAdapterConfig = {
  name: string;
  options: any;
}

export type SocketIOPluginConfig = {
  adapter?: SocketIOAdapterConfig;
  socketioOptions: ServerOptions;
}

// @todo plugin-router
export interface RequestCounter {
  getRequestCount(): number
}
