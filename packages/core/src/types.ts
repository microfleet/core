import {
  ActionTransport,
  CONNECTORS_PROPERTY,
  ConnectorsTypes,
  DATA_KEY_SELECTOR,
  DESTRUCTORS_PROPERTY,
  PLUGIN_STATUS_FAIL,
  PLUGIN_STATUS_OK,
  PluginTypes,
} from './constants';

import { ClientRequest } from 'http';

/**
 * $Keys
 * @desc get the union type of all the keys in an object type `T`
 * @see https://flow.org/en/docs/types/utilities/#toc-keys
 */
export type $Keys<T extends object> = keyof T;

/**
 * $Values
 * @desc get the union type of all the values in an object type `T`
 * @see https://flow.org/en/docs/types/utilities/#toc-values
 */
export type $Values<T extends object> = T[keyof T];

/**
 * Generic PlguinConnect Interface
 */
export type PluginConnector = () => PromiseLike<any>;

/**
 * Plugin Interface
 */
export interface IPluginInterface {
  connect: PluginConnector;
  close: PluginConnector;
  status?: PluginConnector;
}

export interface IPlugin {
  name: string;
  type: $Keys<typeof PluginTypes>;
  attach(conf: any, parentFile: string): void | IPluginInterface;
}

export type MserviceError = Error & {
  statusCode: number;
  toJSON(): any;
};

export type HandlerProperties = typeof CONNECTORS_PROPERTY | typeof DESTRUCTORS_PROPERTY;
export type TransportTypes = $Keys<typeof ActionTransport>;
export type TConnectorsTypes = $Keys<typeof ConnectorsTypes>;
export type RequestMethods = $Keys<typeof DATA_KEY_SELECTOR>;
export type Middleware = (req: IServiceRequest) => PromiseLike<string>;

export type LifecycleRequestType = 'preAllowed' | 'postAllowed'
  | 'preAuth' | 'postAuth'
  | 'preHandler' | 'postHandler'
  | 'preRequest' | 'postRequest'
  | 'preResponse' | 'postResponse'
  | 'preValidate' | 'postValidate';

export interface IServiceAction {
  (...args: any[]): PromiseLike<any>;
  allowed?: () => boolean | Promise<boolean>;
  auth?: string | Middleware;
  passAuthError?: boolean;
  schema?: string;
  transports: TransportTypes[];
  actionName: string;
}

export interface IServiceRequest {
  route: string;
  params: any;
  headers: any;
  query: any;
  method: RequestMethods;
  transport: TransportTypes;
  transportRequest: any | ClientRequest;
  action: IServiceAction;
  locals: any;
  auth?: any;
  socket?: NodeJS.EventEmitter;
  parentSpan: any;
  span: any;
  log: {
    trace(...args: any[]): void,
    debug(...args: any[]): void,
    info(...args: any[]): void,
    warn(...args: any[]): void,
    error(...args: any[]): void,
    fatal(...args: any[]): void,
  };
}

export interface IRouteMap {
  [transport: string]: {
    [routingKey: string]: IServiceAction,
  };
}

export type PluginStatus = typeof PLUGIN_STATUS_OK | typeof PLUGIN_STATUS_FAIL;
