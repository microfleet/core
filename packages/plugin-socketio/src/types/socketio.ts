import { Server, ServerOptions } from 'socket.io'

/**
 * Defines service extension
 */
export interface SocketIOPlugin {
  socketio: Server;
}

export interface RequestCounter {
  getRequestCount(): number
}

export type SocketIOAdapterConfig = {
  name: string;
  options: any;
}

export type SocketIOPluginConfig = {
  adapter?: SocketIOAdapterConfig;
  socketioOptions: ServerOptions;
}
