import {
  ActionTransport,
  CONNECTORS_PROPERTY,
  ConnectorsTypes,
  DATA_KEY_SELECTOR,
  DESTRUCTORS_PROPERTY,
  PLUGIN_STATUS_FAIL,
  PLUGIN_STATUS_OK,
  PluginTypes,
  kReplyHeaders,
} from './constants'

import { ClientRequest } from 'http'

/**
 * Expose Router Type
 */
export { Router } from './plugins/router'

/**
 * $Keys
 * @desc get the union type of all the keys in an object type `T`
 * @see https://flow.org/en/docs/types/utilities/#toc-keys
 */
export type $Keys<T extends object> = keyof T

/**
 * $Values
 * @desc get the union type of all the values in an object type `T`
 * @see https://flow.org/en/docs/types/utilities/#toc-values
 */
export type $Values<T extends object> = T[keyof T]

/**
 * Generic PlguinConnect Interface
 */
export type PluginConnector = () => PromiseLike<any>

/**
 * Plugin Interface
 */
export declare interface PluginInterface {
  connect: PluginConnector;
  close: PluginConnector;
  status?: PluginConnector;
  getRequestCount?: PluginConnector;
}

export declare interface Plugin<T = {}> {
  name: string;
  priority: number;
  type: $Values<typeof PluginTypes>;
  attach(conf: T, parentFile: string): PluginInterface | never;
}

export type MserviceError = Error & {
  statusCode: number;
  toJSON(): any;
}

export declare interface AuthConfig {
  name: string;
  passAuthError: boolean;
  strategy: string;
}

export type HandlerProperties = typeof CONNECTORS_PROPERTY | typeof DESTRUCTORS_PROPERTY
export type TransportTypes = $Values<typeof ActionTransport>
export type TConnectorsTypes = $Values<typeof ConnectorsTypes>
export type RequestMethods = $Keys<typeof DATA_KEY_SELECTOR>
export type GetAuthName = (req: ServiceRequestInterface) => string
export type ServiceActionStep = (...args: any[]) => PromiseLike<any>

export declare interface ServiceAction extends ServiceActionStep {
  allowed?: () => boolean | Promise<boolean>;
  auth?: string | GetAuthName | AuthConfig;
  passAuthError?: boolean;
  schema?: string;
  transports: TransportTypes[];
  actionName: string;
  readonly?: boolean;
}

export declare interface ServiceRequestInterface {
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  new(
    transport: TransportTypes,
    method: RequestMethods,
    query: any,
    headers: any,
    params: any,
    transportRequest: any | ClientRequest,
    socket?: NodeJS.EventEmitter,
    parentSpan?: any,
  ): ServiceRequestInterface;

  (): void;

  route: string;
  params: any;
  headers: any;
  query: any;
  method: RequestMethods;
  transport: TransportTypes;
  transportRequest: any | ClientRequest;
  action: ServiceAction;
  locals: any;
  auth?: any;
  socket?: NodeJS.EventEmitter;
  parentSpan: any;
  span: any;
  log: {
    trace(...args: any[]): void;
    debug(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    fatal(...args: any[]): void;
  };
  [kReplyHeaders]: ReplyHeaders;
  setReplyHeader: (title: string, value: string) => ServiceRequestInterface;
  removeReplyHeader: (title: string) => ServiceRequestInterface;
  getReplyHeaders: () => ReplyHeaders;
  getReplyHeader?: ReplyHeaderValue;
}

export type ReplyHeaderValue = string[]|string
export type ReplyHeaders = Map<string, ReplyHeaderValue>

export type PluginStatus = typeof PLUGIN_STATUS_OK | typeof PLUGIN_STATUS_FAIL
