import { Server, ServerOptions } from 'socket.io'

declare module '@microfleet/core' {
  export interface Microfleet {
    // @todo fix type for socketio adapter
    // ../plugin-socketio/__tests__/socketio.spec.ts:39:50 - error TS2339: Property 'transport' does not exist on type 'Adapter'.
    // strictEqual(service.socketio.sockets.adapter.transport instanceof AdapterTransport, true)
    socketio: Server;
  }

  export interface ConfigurationOptional {
    socketio: SocketIOPluginConfig;
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

// @todo plugin-router?
export interface RequestCounter {
  getRequestCount(): number
}
