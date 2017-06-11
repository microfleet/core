// @flow
import type EventEmitter from 'events';

/* eslint-disable promise/no-native, no-use-before-define */
const constants = require('./constants');

export type PluginConnector = () => Promise<any>;

export type PluginInterface = {
  connect: PluginConnector,
  close: PluginConnector,
};

export type Plugin = {
  name: string,
  type: $Keys<typeof constants.PluginsTypes>,
  attach: (conf: Object, parentFile: string) => void | PluginInterface,
};

export type MserviceError = Error & {
  toJSON: () => mixed | void,
  statusCode: number,
};

export type TransportTypes = $Keys<typeof constants.ActionTransport>;

export type ConnectorsTypes = $Keys<typeof constants.ConnectorsTypes>;

export type HandlerProperties = typeof constants.CONNECTORS_PROPERTY | typeof constants.DESTRUCTORS_PROPERTY;

export type RequestMethods = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put' | 'amqp' | 'socketio';

export type LifecycleRequestType = 'preAllowed' | 'postAllowed'
  | 'preAuth' | 'postAuth'
  | 'preHandler' | 'postHandler'
  | 'preRequest' | 'postRequest'
  | 'preResponse' | 'postResponse'
  | 'preValidate' | 'postValidate';

export type ServiceAction = (...args: Array<mixed>) => Promise<any> & {
  allowed?: () => boolean | Promise<boolean>,
  auth?: string | (req: ServiceRequest) => string,
  passAuthError?: boolean,
  schema?: string,
  transports: Array<TransportTypes>,
  actionName: string,
};

export type ServiceRequest = {
  route: string,
  params: mixed,
  headers: Object,
  query: Object,
  method: RequestMethods,
  transport: TransportTypes,
  transportRequest: Object | http$ClientRequest,
  action: ServiceAction,
  auth?: Object,
  socket?: EventEmitter,
};

export type RouteMap = {
  _all: {
    [routingKey: string]: ServiceAction,
  },
  [transport: TransportTypes]: {
    [routingKey: string]: ServiceAction,
  },
};
