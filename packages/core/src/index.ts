/**
 * Microservice Abstract Class
 * @module Microfleet
 */

import { strict as assert } from 'assert'
import Bluebird = require('bluebird')
import EventEmitter = require('eventemitter3')
import is = require('is')
import partial = require('lodash.partial')
import * as constants from './constants'
import * as defaultOpts from './defaults'
import { DeepPartial } from 'ts-essentials'
import { HttpStatusError } from '@microfleet/validation'
import {
  getHealthStatus,
  PluginHealthCheck
} from './utils/pluginHealthStatus'
import {
  HandlerProperties,
  Plugin,
  PluginInterface,
  PluginConnector,
  TConnectorsTypes,
} from './types'
import { ValidatorPlugin, ValidatorConfig } from './plugins/validator'
import { LoggerPlugin, LoggerConfig } from './plugins/logger'
import { RouterConfig, RouterPlugin, LifecycleRequestType } from './plugins/router'
import defaultsDeep from './utils/defaults-deep'
export { ValidatorPlugin, LoggerPlugin, RouterPlugin, LifecycleRequestType }

/**
 * Simple invocation that preserves context.
 * @param fn - Function to invoke.
 */
function invoke(this: any, fn: (...args: any[]) => any): any {
  return fn.call(this)
}

const toArray = <T>(x: T): T[] => Array.isArray(x) ? x : [x]

interface StartStopTree {
  [name: string]: PluginConnector[]
}

export * from './types'

/**
 * Constants with possilble transport values
 * @memberof Microfleet
 */
export const ActionTransport = constants.ActionTransport

/**
 * Constants with connect types to control order of service bootstrap
 * @memberof Microfleet
 */
export const ConnectorsTypes = constants.ConnectorsTypes

/**
 * Default priority of connectors during bootstrap
 * @memberof Microfleet
 */
export const ConnectorsPriority = constants.ConnectorsPriority

/**
 * Plugin Types
 * @memberof Microfleet
 */
export const PluginTypes = constants.PluginTypes

/**
 * Plugin boot priority
 * @memberof Microfleet
 */
export const PluginsPriority = constants.PluginsPriority

/**
 * Helper method to enable router extensions.
 * @param name - Pass extension name to require.
 * @returns Extension to router plugin.
 */
export const routerExtension = (name: string) => {
  return require(require.resolve(`./plugins/router/extensions/${name}`)).default
}

/**
 * Interface for optional params
 */
export interface ConfigurationOptional {
  /**
   * List of plugins to be enabled
   */
  plugins: string[]

  /**
   * Logger plugin configuration
   */
  logger: LoggerConfig

  /**
   * Validator plugin configuration
   */
  validator: ValidatorConfig

  /**
   * Router configuration
   */
  router: RouterConfig
}

/**
 * Interface for required params
 */
export interface ConfigurationRequired {
  /**
   * Must uniquely identify service, will be used
   * in implementing services extensively
   */
  name: string

  /**
   * For now any property can be put on the main class
   */
  [property: string]: any
}

export type CoreOptions = ConfigurationRequired
  & ConfigurationOptional

/**
 * @class Microfleet
 */
export class Microfleet extends EventEmitter {
  public config: CoreOptions
  public migrators: any
  public readonly plugins: string[]
  public readonly [constants.CONNECTORS_PROPERTY]: StartStopTree
  public readonly [constants.DESTRUCTORS_PROPERTY]: StartStopTree
  public readonly [constants.HEALTH_CHECKS_PROPERTY]: PluginHealthCheck[]

  /**
   * Allow Extensions
   */
  [property: string]: any;

  /**
   * @param [opts={}] - Overrides for configuration.
   * @returns Instance of microservice.
   */
  constructor(opts: ConfigurationRequired & DeepPartial<ConfigurationOptional>) {
    super()

    // init configuration
    this.config = defaultsDeep(opts, defaultOpts) as any

    // init migrations
    this.migrators = Object.create(null)

    // init health status checkers
    this[constants.HEALTH_CHECKS_PROPERTY] = []

    // init plugins
    this.plugins = []
    this[constants.CONNECTORS_PROPERTY] = Object.create(null)
    this[constants.DESTRUCTORS_PROPERTY] = Object.create(null)

    // setup error listener
    this.on('error', this.onError)
    this.initPlugins(this.config)

    // setup hooks
    for (const [eventName, hooks] of Object.entries(this.config.hooks)) {
      for (const hook of toArray<any>(hooks)) {
        this.on(eventName, hook)
      }
    }

    if (this.config.sigterm) {
      this.on('ready', () => {
        process.on('SIGTERM', this.exit)
      })

      this.on('close', () => {
        process.removeListener('SIGTERM', this.exit)
      })
    }
  }

  /**
   * Asyncronously calls event listeners
   * and waits for them to complete.
   * This is a bit odd compared to normal event listeners,
   * but works well for dynamically running async actions and waiting
   * for them to complete.
   *
   * @param event - Hook name to be called during execution.
   * @param args - Arbitrary args to pass to the hooks.
   * @returns Result of invoked hook.
   */
  public async hook(event: string, ...args: any[]) {
    const listeners = this.listeners(event)
    const work = []

    for (const listener of listeners.values()) {
      work.push(listener.apply(this, args))
    }

    return Promise.all(work)
  }

  /**
   * Adds migrators.
   * @param name - Migrator name.
   * @param fn - Migrator function to be invoked.
   * @param args - Arbitrary args to be passed to fn later on.
   */
  public addMigrator(name: string, fn: (...args: any[]) => any, ...args: any[]) {
    // @ts-ignore
    this.migrators[name] = partial(fn, ...args)
  }

  /**
   * Performs migration for a given database or throws if migrator is not present.
   * @param  name - Name of the migration to invoke.
   * @param  args - Extra args to pass to the migrator.
   * @returns Result of the migration.
   */
  public migrate(name: string, ...args: any[]) {
    const migrate = this.migrators[name]
    assert(is.fn(migrate), `migrator ${name} not defined`)
    return migrate(...args)
  }

  /**
   * Generic connector for all of the plugins.
   * @returns Walks over registered connectors and emits ready event upon completion.
   */
  public async connect() {
    return this.processAndEmit(this.getConnectors(), 'ready', ConnectorsPriority)
  }

  /**
   * Generic cleanup function.
   * @returns Walks over registered destructors and emits close event upon completion.
   */
  public async close() {
    return this.processAndEmit(this.getDestructors(), 'close', [...ConnectorsPriority].reverse())
  }

  // ****************************** Plugin section: public ************************************

  /**
   * Public function to init plugins.
   *
   * @param mod - Plugin module instance.
   * @param mod.name - Plugin name.
   * @param mod.attach - Plugin attach function.
   * @param [conf] - Configuration in case it's not present in the core configuration object.
   */
  public initPlugin<T extends object>(mod: Plugin<T>, conf?: any) {
    this.plugins.push(mod.name)

    let expose: PluginInterface

    try {
      expose = mod.attach.call(this, conf || this.config[mod.name], __filename)
    } catch (e) {
      if (e.constructor === HttpStatusError) {
        e.message = `[@microfleet/core] Could not attach ${mod.name}:\n${e.message}`
      }

      throw e
    }

    if (!is.object(expose)) {
      return
    }

    const { connect, status, close } = expose as PluginInterface
    const type = ConnectorsTypes[mod.type] as TConnectorsTypes

    assert(type, 'Plugin type must be equal to one of connectors type')

    if (typeof connect === 'function') {
      this.addConnector(type, connect)
    }

    if (typeof close === 'function') {
      this.addDestructor(type, close)
    }

    if (typeof status === 'function') {
      this.addHealthCheck(new PluginHealthCheck(mod.name, status))
    }
  }

  /**
   * Returns registered connectors.
   * @returns Connectors.
   */
  public getConnectors(): StartStopTree {
    return this[constants.CONNECTORS_PROPERTY]
  }

  /**
   * Returns registered destructors.
   * @returns Destructors.
   */
  public getDestructors(): StartStopTree {
    return this[constants.DESTRUCTORS_PROPERTY]
  }

  /**
   * Returns registered health checks.
   * @returns Health checks.
   */
  public getHealthChecks(): PluginHealthCheck[] {
    return this[constants.HEALTH_CHECKS_PROPERTY]
  }

  /**
   * Initializes connectors on the instance of Microfleet.
   * @param {string} type - Connector type.
   * @param {Function} handler - Plugin connector.
   */
  public addConnector(type: TConnectorsTypes, handler: PluginConnector) {
    this.addHandler(constants.CONNECTORS_PROPERTY, type, handler)
  }

  /**
   * Initializes destructor on the instance of Microfleet.
   * @param {string} type - Destructor type.
   * @param {Function} handler - Plugin destructor.
   */
  public addDestructor(type: TConnectorsTypes, handler: PluginConnector) {
    this.addHandler(constants.DESTRUCTORS_PROPERTY, type, handler)
  }

  /**
   * Initializes plugin health check.
   * @param {Function} handler - Health check function.
   */
  public addHealthCheck(handler: PluginHealthCheck) {
    this[constants.HEALTH_CHECKS_PROPERTY].push(handler)
  }

  /**
   * Asks for health status of registered plugins if it's possible, logs it and returns summary.
   */
  public getHealthStatus() {
    return getHealthStatus(this.getHealthChecks(), this.config.healthChecks)
  }

  public hasPlugin(name: string) {
    return this.plugins.includes(name)
  }

  /**
   * Overrides SIG* events and exits cleanly.
   * @returns Resolves when exit sequence has completed.
   */
  private exit = async () => {
    this.log.info('received close signal...\n closing connections...\n')

    try {
      await Promise.race([
        this.close(),
        Bluebird.delay(10000).throw(new Bluebird.TimeoutError('failed to close after 10 seconds')),
      ])
    } catch (e) {
      process.exit(128)
    }
  }

  /**
   * Helper for calling funcs and emitting event after.
   *
   * @param collection - Object with namespaces for arbitrary handlers.
   * @param event - Type of handlers that must be called.
   * @param [priority=Microfleet.ConnectorsPriority] - Order to process collection.
   * @returns Result of the invocation.
   */
  private async processAndEmit(collection: any, event: string, priority = ConnectorsPriority) {
    const responses = []
    for (const connectorType of priority) {
      const connectors: PluginConnector[] | void = collection[connectorType]
      if (!connectors) {
        continue
      }

      responses.push(...await Bluebird.resolve(connectors).bind(this).map(invoke))
    }

    this.emit(event)

    return responses
  }

  // ***************************** Plugin section: private **************************************

  private addHandler(property: HandlerProperties, type: TConnectorsTypes, handler: PluginConnector) {
    if (this[property][type] === undefined) {
      this[property][type] = []
    }

    this[property][type].push(handler)
  }

  /**
   * Initializes service plugins.
   * @param {Object} config - Service plugins configuration.
   * @private
   */
  private initPlugins(config: CoreOptions) {
    for (const pluginType of PluginsPriority) {
      this[constants.CONNECTORS_PROPERTY][pluginType] = []
      this[constants.DESTRUCTORS_PROPERTY][pluginType] = []
    }

    // require all modules
    const plugins: Plugin[] = []
    for (const plugin of config.plugins) {
      const paths = [`./plugins/${plugin}`, `@microfleet/plugin-${plugin}`]
      const pluginModule: Plugin | null = paths.reduce(resolveModule, null)

      if (pluginModule === null) {
        throw new Error(`failed to init ${plugin}`)
      }

      plugins.push(pluginModule)
    }

    // sort and ensure that they are attached based
    // on their priority
    plugins.sort(this.pluginComparator)

    // call the .attach function
    for (const plugin of plugins) {
      this.initPlugin(plugin)
    }

    this.emit('init')
  }

  private pluginComparator(a: Plugin<any>, b: Plugin<any>): number {
    const ap = PluginsPriority.indexOf(a.type)
    const bp = PluginsPriority.indexOf(b.type)

    // same plugin type, check priority
    if (ap === bp) {
      if (a.priority < b.priority) return -1
      if (a.priority > b.priority) return 1
      return 0
    }

    // different plugin types, sort based on it
    if (ap < bp) return -1
    return 1
  }

  /**
   * Notifies about errors when no other listeners are present
   * by throwing them.
   * @param err - Error that was emitted by the service members.
   */
  private onError = (err: Error) => {
    if (this.listeners('error').length > 1) {
      return
    }

    throw err
  }
}

function resolveModule<T>(cur: T | null, path: string): T | null {
  if (cur != null) {
    return cur
  }

  try {
    return require(require.resolve(path))
  } catch (e) {
    return null
  }
}

// if there is no parent module we assume it's called as a binary
if (!module.parent) {
  const mservice = new Microfleet({ name: 'cli' })
  mservice
    .connect()
    .catch((err: Error) => {
      mservice.log.fatal('Failed to start service', err)
      setImmediate(() => { throw err })
    })
}
