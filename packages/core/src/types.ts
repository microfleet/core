/* tslint:disable:prefer-array-literal */

import {
  ActionTransport,
  CONNECTORS_PROPERTY,
  ConnectorsTypes,
  DATA_KEY_SELECTOR,
  DESTRUCTORS_PROPERTY,
  PLUGIN_STATUS_FAIL,
  PLUGIN_STATUS_OK,
  PluginTypes
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
 * DeepPartial
 * @desc marks all nested properties as partial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer X> ? ReadonlyArray<DeepPartial<X>> : DeepPartial<T[P]>
}

/**
 * Generic PlguinConnect Interface
 */
export type PluginConnector = () => PromiseLike<any>

/**
 * Plugin Interface
 */
export interface PluginInterface {
  connect: PluginConnector
  close: PluginConnector
  status?: PluginConnector
}

export interface Plugin {
  name: string
  priority: number
  type: $Values<typeof PluginTypes>
  attach(conf: any, parentFile: string): PluginInterface | never
}

export type MserviceError = Error & {
  statusCode: number;
  toJSON(): any;
}

export interface AuthConfig {
  name: string
  passAuthError: boolean
  strategy: string
}

export type HandlerProperties = typeof CONNECTORS_PROPERTY | typeof DESTRUCTORS_PROPERTY
export type TransportTypes = $Values<typeof ActionTransport>
export type TConnectorsTypes = $Values<typeof ConnectorsTypes>
export type RequestMethods = $Keys<typeof DATA_KEY_SELECTOR>
export type GetAuthName = (req: ServiceRequestInterface) => string
export type ServiceActionStep = (...args: any[]) => PromiseLike<any>
export interface ServiceAction extends ServiceActionStep {
  allowed?: () => boolean | Promise<boolean>
  auth?: string | GetAuthName | AuthConfig
  passAuthError?: boolean
  schema?: string
  transports: TransportTypes[]
  actionName: string
  readonly?: boolean
}

export interface ServiceRequestInterface {
  route: string
  params: any
  headers: any
  query: any
  method: RequestMethods
  transport: TransportTypes
  transportRequest: any | ClientRequest
  action: ServiceAction
  locals: any
  auth?: any
  socket?: NodeJS.EventEmitter
  parentSpan: any
  span: any
  log: {
    trace(...args: any[]): void,
    debug(...args: any[]): void,
    info(...args: any[]): void,
    warn(...args: any[]): void,
    error(...args: any[]): void,
    fatal(...args: any[]): void
  }
  setResponseHeader?: Function
  removeResponseHeader?: Function
  getResponseHeaders?: Function
}

export type ResponseHeaders = {
  [key: string]: string
}

export type PluginStatus = typeof PLUGIN_STATUS_OK | typeof PLUGIN_STATUS_FAIL
