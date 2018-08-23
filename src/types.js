// @flow
import type EventEmitter from 'events';

/* eslint-disable promise/no-native, no-use-before-define, import/prefer-default-export */
const constants = require('./constants');

declare type PluginConnector = () => Promise<any>;

declare type PluginInterface = {
  connect: PluginConnector,
  close: PluginConnector,
  status?: PluginConnector,
};

declare type Plugin = {
  name: string,
  type: $Values<typeof constants.PluginsTypes>,
  attach: (conf: Object, parentFile: string) => void | PluginInterface,
};

declare type MserviceError = Error & {
  toJSON: () => mixed | void,
  statusCode: number,
};

declare class HttpServer extends net$Server {
  listen(port?: number, hostname?: string, backlog?: number, callback?: Function): HttpServer;
  // The following signatures are added to allow omitting intermediate arguments
  listen(port?: number, backlog?: number, callback?: Function): HttpServer;
  listen(port?: number, hostname?: string, callback?: Function): HttpServer;
  listen(port?: number, callback?: Function): HttpServer;
  listen(path: string, callback?: Function): HttpServer;
  listen(handle: Object, callback?: Function): HttpServer;
  close(callback?: (error: ?Error) => mixed): HttpServer;
  closeAsync?: () => Promise<*>;
  maxHeadersCount: number;
  setTimeout(msecs: number, callback: Function): HttpServer;
  timeout: number;
  listening?: boolean;
  destroy(callback?: (error: ?Error) => mixed): void;
  destroyAsync?: () => Promise<*>;
}

declare type TransportTypes = $Values<typeof constants.ActionTransport>;

declare type ConnectorsTypes = $Values<typeof constants.ConnectorsTypes>;

declare type HandlerProperties = typeof constants.CONNECTORS_PROPERTY | typeof constants.DESTRUCTORS_PROPERTY;

declare type RequestMethods = $Keys<typeof constants.DATA_KEY_SELECTOR>;

declare type ValidationObjectSelector = {
  [key: RequestMethods]: 'query' | 'params'
};

declare type LifecycleRequestType = 'preAllowed' | 'postAllowed'
  | 'preAuth' | 'postAuth'
  | 'preHandler' | 'postHandler'
  | 'preRequest' | 'postRequest'
  | 'preResponse' | 'postResponse'
  | 'preValidate' | 'postValidate';

declare type ServiceAction = (...args: Array<mixed>) => Promise<any> & {
  allowed?: () => boolean | Promise<boolean>,
  auth?: string | (req: ServiceRequest) => string,
  passAuthError?: boolean,
  schema?: string,
  transports: Array<TransportTypes>,
  actionName: string,
};

declare type ServiceRequest = {
  route: string,
  params: mixed,
  headers: Object,
  query: Object,
  method: RequestMethods,
  transport: TransportTypes,
  transportRequest: Object | http$ClientRequest,
  action: ServiceAction,
  locals: Object,
  auth?: Object,
  socket?: EventEmitter,
  parentSpan: any,
  span: any,
  log: {
    trace(...args: Array<any>): mixed,
    debug(...args: Array<any>): mixed,
    info(...args: Array<any>): mixed,
    warn(...args: Array<any>): mixed,
    error(...args: Array<any>): mixed,
    fatal(...args: Array<any>): mixed,
  }
};

declare type RouteMap = {
  _all: {
    [routingKey: string]: ServiceAction,
  },
  [transport: TransportTypes]: {
    [routingKey: string]: ServiceAction,
  },
};

declare type PluginStatus = 'ok' | 'fail';
declare type PluginHealthStatus = {
  name: string,
  status: PluginStatus,
  error?: Error,
};
declare type PluginHealthCheck = {
  name: string,
  handler: Function,
};
