import type { Options as RetryOptions } from 'bluebird-retry'
import type { ClientRequest } from 'http'
import type { ListenerFn } from 'eventemitter3'
import type {
  ActionTransport,
  CONNECTORS_PROPERTY,
  ConnectorsTypes,
  DESTRUCTORS_PROPERTY,
  PLUGIN_STATUS_FAIL,
  PLUGIN_STATUS_OK,
  PluginTypes,
} from '@microfleet/utils'

export type StartStopTree = {
  [K in ConnectorsTypes]: PluginConnector[]
}

export class Microfleet {
  readonly version: string
  readonly migrators: { [name: string]: AnyFn }
  readonly plugins: string[]
  readonly [CONNECTORS_PROPERTY]: StartStopTree
  readonly [DESTRUCTORS_PROPERTY]: StartStopTree

  /**
   * Holds configuration
   */
  config: CoreOptions

  /**
   * Allow Extensions
   */
  [property: string]: any;
}

export type AnyFn = (...args: any[]) => any;
export type Hook = ListenerFn | ListenerFn[];

/**
 * Interface for optional params
 */
export interface ConfigurationOptional {
  /**
   * List of plugins to be enabled
   */
  plugins: string[];

  /**
  * Arbitrary hooks to be executed asynchronously
  */
  hooks: {
    [name: string]: Hook;
  };

  /**
   * Healthcheck configurations
   */
  healthChecks: RetryOptions
}

/**
 * Interface for required params
 */
export interface ConfigurationRequired {
  /**
   * Must uniquely identify service, will be used
   * in implementing services extensively
   */
  name: string;

  /**
   * For now any property can be put on the main class
   */
  [property: string]: unknown;
}

export type CoreOptions = ConfigurationRequired
  & ConfigurationOptional

/**
 * $Keys
 * @desc get the union type of all the keys in an object type `T`
 * @see https://flow.org/en/docs/types/utilities/#toc-keys
 */
export type $Keys<T extends Record<string, unknown>> = keyof T

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
export interface PluginInterface {
  connect?: PluginConnector;
  close?: PluginConnector;
  status?: PluginConnector;
  getRequestCount?: () => number;
}

export interface Plugin<T = Record<string, unknown>> {
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
export type ConnectorsTypes = $Values<typeof ConnectorsTypes>
export type PluginStatus = typeof PLUGIN_STATUS_OK | typeof PLUGIN_STATUS_FAIL
