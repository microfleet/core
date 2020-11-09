import type * as ns from '@microfleet/core-types'
import type { DeepPartial } from 'ts-essentials'

/**
 * Microservice Abstract Class
 * @module Microfleet
 */
import { resolve } from 'path'
import { strict as assert } from 'assert'
import Bluebird = require('bluebird')
import { EventEmitter } from 'eventemitter3'
import is = require('is')
import * as defaultOpts from './defaults'
import { HttpStatusError } from '@microfleet/validation'
import {
  getHealthStatus,
  PluginHealthCheck,
  HealthStatus,
  PluginHealthStatus,
} from './utils/pluginHealthStatus'
import { RedisPlugin } from './plugins/redis/types'
import {
  defaultsDeep,
  getVersion,
  PluginsPriority,
  ConnectorsTypes,
  ConnectorsPriority,
  CONNECTORS_PROPERTY,
  DESTRUCTORS_PROPERTY,
  HEALTH_CHECKS_PROPERTY
} from '@microfleet/utils'

export {
  RedisPlugin,
  PluginHealthStatus,
  HealthStatus,
}

const toArray = <T>(x: T | T[]): T[] => Array.isArray(x) ? x : [x]

export {
  PLUGIN_STATUS_OK,
  PLUGIN_STATUS_FAIL,
  PluginTypes,
  PluginsPriority,
  ActionTransport,
  ConnectorsTypes,
  ConnectorsPriority
} from '@microfleet/utils'

/**
 * Helper method to enable router extensions.
 * @param name - Pass extension name to require.
 * @returns Extension to router plugin.
 */
export const routerExtension = (name: string): unknown => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(require.resolve(`./plugins/router/extensions/${name}`)).default
}

function resolveModule<T>(cur: T | null, path: string): T | null {
  if (cur != null) {
    return cur
  }

  try {
    return require(require.resolve(path))
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      // eslint-disable-next-line no-console
      console.warn(e)
    } else if (process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line no-console
      console.warn('couldnt include', e.message)
    }

    return null
  }
}

/**
 * @class Microfleet
 */
export class Microfleet extends EventEmitter {
  public static readonly version: string = getVersion()

  public config: ns.CoreOptions
  public readonly version: string
  public readonly migrators: { [name: string]: ns.AnyFn }
  public readonly plugins: string[]
  public readonly [CONNECTORS_PROPERTY]: ns.StartStopTree
  public readonly [DESTRUCTORS_PROPERTY]: ns.StartStopTree
  public readonly [HEALTH_CHECKS_PROPERTY]: PluginHealthCheck[]
  private connectorToPlugin: Map<ns.PluginConnector, string>

  /**
   * Allow Extensions
   */
  [property: string]: any;

  /**
   * @param [opts={}] - Overrides for configuration.
   * @returns Instance of microservice.
   */
  constructor(opts: ns.ConfigurationRequired & DeepPartial<ns.ConfigurationOptional>) {
    super()

    // init configuration
    this.config = defaultsDeep(opts, defaultOpts) as ns.CoreOptions
    this.exit = this.exit.bind(this)
    this.version = Microfleet.version

    // init migrations
    this.migrators = Object.create(null)
    this.connectorToPlugin = new Map()

    // init health status checkers
    this[HEALTH_CHECKS_PROPERTY] = []

    // init plugins
    this.plugins = []
    this[CONNECTORS_PROPERTY] = Object.create(null)
    this[DESTRUCTORS_PROPERTY] = Object.create(null)

    // setup error listener
    this.on('error', this.onError)
    this.initPlugins(this.config)

    // setup hooks
    for (const [eventName, hooks] of Object.entries(this.config.hooks)) {
      for (const hook of toArray(hooks)) {
        this.on(eventName, hook)
      }
    }

    if (this.config.sigterm) {
      this.on('ready', () => {
        process.once('SIGTERM', this.exit)
        process.once('SIGINT', this.exit)
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
  public async hook(event: string, ...args: unknown[]): Promise<any[]> {
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
  public addMigrator(name: string, fn: ns.AnyFn, ...args: any[]): void {
    this.migrators[name] = (...migratorArgs: any[]): any => fn.call(this, ...args, ...migratorArgs)
  }

  /**
   * Performs migration for a given database or throws if migrator is not present.
   * @param  name - Name of the migration to invoke.
   * @param  args - Extra args to pass to the migrator.
   * @returns Result of the migration.
   */
  public migrate(name: string, ...args: unknown[]): any {
    const migrate = this.migrators[name]
    assert(is.fn(migrate), `migrator ${name} not defined`)
    return migrate(...args)
  }

  /**
   * Generic connector for all of the plugins.
   * @returns Walks over registered connectors and emits ready event upon completion.
   */
  public async connect(): Promise<unknown[]> {
    return this.processAndEmit(this.getConnectors(), 'ready', ConnectorsPriority)
  }

  /**
   * Generic cleanup function.
   * @returns Walks over registered destructors and emits close event upon completion.
   */
  public async close(): Promise<any> {
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
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public initPlugin<T extends Record<string, unknown>>(mod: ns.Plugin<T>, conf?: any): void {
    const pluginName = mod.name

    let expose: ns.PluginInterface

    try {
      const configuration = conf || this.config[mod.name] || Object.create(null)

      // Temporary workaround while we have bundled schemas
      if (pluginName === 'validator') {
        configuration.schemas ||= []
        configuration.schemas.push(resolve(__dirname, '../schemas'))
      }

      expose = mod.attach.call(this, configuration, __filename)
    } catch (e) {
      if (e.constructor === HttpStatusError) {
        e.message = `[@microfleet/core] Could not attach ${mod.name}:\n${e.message}`
      }

      throw e
    }

    this.plugins.push(pluginName)

    if (!is.object(expose)) {
      return
    }

    const { connect, status, close } = expose as ns.PluginInterface
    const type = ConnectorsTypes[mod.type] as ns.ConnectorsTypes

    assert(type, 'Plugin type must be equal to one of connectors type')

    if (typeof connect === 'function') {
      this.addConnector(type, connect, pluginName)
    }

    if (typeof close === 'function') {
      this.addDestructor(type, close, pluginName)
    }

    if (typeof status === 'function') {
      this.addHealthCheck(new PluginHealthCheck(mod.name, status))
    }
  }

  /**
   * Returns registered connectors.
   * @returns Connectors.
   */
  public getConnectors(): ns.StartStopTree {
    return this[CONNECTORS_PROPERTY]
  }

  /**
   * Returns registered destructors.
   * @returns Destructors.
   */
  public getDestructors(): ns.StartStopTree {
    return this[DESTRUCTORS_PROPERTY]
  }

  /**
   * Returns registered health checks.
   * @returns Health checks.
   */
  public getHealthChecks(): PluginHealthCheck[] {
    return this[HEALTH_CHECKS_PROPERTY]
  }

  /**
   * Initializes connectors on the instance of Microfleet.
   * @param type - Connector type.
   * @param handler - Plugin connector.
   * @param plugin - name of the plugin, optional.
   */
  public addConnector(type: ns.ConnectorsTypes, handler: ns.PluginConnector, plugin?: string): void {
    this.addHandler(CONNECTORS_PROPERTY, type, handler, plugin)
  }

  /**
   * Initializes destructor on the instance of Microfleet.
   * @param type - Destructor type.
   * @param handler - Plugin destructor.
   * @param plugin - name of the plugin, optional.
   */
  public addDestructor(type: ns.ConnectorsTypes, handler: ns.PluginConnector, plugin?: string): void {
    this.addHandler(DESTRUCTORS_PROPERTY, type, handler, plugin)
  }

  /**
   * Initializes plugin health check.
   * @param {Function} handler - Health check function.
   */
  public addHealthCheck(handler: PluginHealthCheck): void {
    this[HEALTH_CHECKS_PROPERTY].push(handler)
  }

  /**
   * Asks for health status of registered plugins if it's possible, logs it and returns summary.
   */
  public getHealthStatus(): Promise<HealthStatus> {
    return getHealthStatus.call(this, this.getHealthChecks(), this.config.healthChecks)
  }

  public hasPlugin(name: string): boolean {
    return this.plugins.includes(name)
  }

  /**
   * Overrides SIG* events and exits cleanly.
   * @returns Resolves when exit sequence has completed.
   */
  private async exit(): Promise<void> | never {
    this.log.info('received close signal... closing connections...')

    try {
      await Promise.race([
        this.close(),
        Bluebird.delay(30000).throw(new Bluebird.TimeoutError('failed to close after 10 seconds')),
      ])
    } catch (e) {
      this.log.error({ error: e }, 'Unable to shutdown')
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
  private async processAndEmit(collection: ns.StartStopTree, event: string, priority = ConnectorsPriority): Promise<any[]> {
    const responses = []
    for (const connectorType of priority) {
      const connectors: ns.PluginConnector[] | void = collection[connectorType]
      if (!connectors) {
        continue
      }

      for (const handler of connectors) {
        const pluginName = this.connectorToPlugin.get(handler)
        if (this.log) {
          this.log.info({ pluginName, connectorType, event }, 'started')
        }

        responses.push(await handler.call(this))

        if (this.log) {
          this.log.info({ pluginName, connectorType, event }, 'completed')
        }
      }
    }

    this.emit(event)

    return responses
  }

  // ***************************** Plugin section: private **************************************
  private addHandler(property: ns.HandlerProperties, type: ns.ConnectorsTypes, handler: ns.PluginConnector, plugin?: string): void {
    if (this[property][type] === undefined) {
      this[property][type] = []
    }

    if (property === DESTRUCTORS_PROPERTY) {
      // reverse
      this[property][type].unshift(handler)
    } else {
      this[property][type].push(handler)
    }

    if (plugin) {
      this.connectorToPlugin.set(handler, plugin)
    }
  }

  /**
   * Initializes service plugi`ns.
   * @param {Object} config - Service plugins configuration.
   * @private
   */
  private initPlugins(config: ns.CoreOptions): void {
    for (const pluginType of PluginsPriority) {
      this[CONNECTORS_PROPERTY][pluginType] = []
      this[DESTRUCTORS_PROPERTY][pluginType] = []
    }

    // require all modules
    const plugins: ns.Plugin[] = []
    for (const plugin of config.plugins) {
      const paths = [`./plugins/${plugin}`, `@microfleet/plugin-${plugin}`]
      const pluginModule: ns.Plugin | null = paths.reduce(resolveModule, null)

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

  private pluginComparator(a: ns.Plugin, b: ns.Plugin): number {
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
  private onError = (err: Error): void | never => {
    if (this.listeners('error').length > 1) {
      return
    }

    throw err
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Microfleet extends ns.Microfleet {}

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
