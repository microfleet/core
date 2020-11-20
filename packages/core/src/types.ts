import {
  CONNECTORS_PROPERTY,
  ConnectorsTypes,
  DESTRUCTORS_PROPERTY,
  PLUGIN_STATUS_FAIL,
  PLUGIN_STATUS_OK,
  PluginTypes
} from './constants'

/**
 * $Values
 * @desc get the union type of all the values in an object type `T`
 * @see https://flow.org/en/docs/types/utilities/#toc-values
 */
export type $Values<T extends Record<string, unknown>> = T[keyof T]

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
  getRequestCount?: () => number;
}

export declare interface Plugin<T = Record<string, unknown>> {
  name: string;
  priority: number;
  type: $Values<typeof PluginTypes>;
  attach(conf: T, parentFile: string): PluginInterface | never;
}

export type MserviceError = Error & {
  statusCode: number;
  toJSON(): any;
}

export type HandlerProperties = typeof CONNECTORS_PROPERTY | typeof DESTRUCTORS_PROPERTY
export type TConnectorsTypes = $Values<typeof ConnectorsTypes>
export type PluginStatus = typeof PLUGIN_STATUS_OK | typeof PLUGIN_STATUS_FAIL
