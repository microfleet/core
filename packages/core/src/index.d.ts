/**
 * Microservice Abstract Class
 * @module Microfleet
 */
import EventEmitter = require('eventemitter3');
import * as constants from './constants';
import { DeepPartial } from 'ts-essentials';
import { PluginHealthCheck } from './utils/pluginHealthStatus';
import { Plugin, PluginConnector, TConnectorsTypes } from './types';
import { ValidatorPlugin, ValidatorConfig } from './plugins/validator';
import { RouterConfig, RouterPlugin, LifecycleRequestType } from './plugins/router';
import { HealthStatus } from './utils/pluginHealthStatus';
export { ValidatorPlugin, RouterPlugin, LifecycleRequestType };
interface StartStopTree {
    [name: string]: PluginConnector[];
}
export * from './types';
/**
 * Constants with possilble transport values
 * @memberof Microfleet
 */
export declare const ActionTransport: {
    amqp: "amqp";
    http: "http";
    internal: "internal";
    socketIO: "socketIO";
};
/**
 * Constants with connect types to control order of service bootstrap
 * @memberof Microfleet
 */
export declare const ConnectorsTypes: {
    application: "application";
    database: "database";
    essential: "essential";
    migration: "migration";
    transport: "transport";
};
/**
 * Default priority of connectors during bootstrap
 * @memberof Microfleet
 */
export declare const ConnectorsPriority: ("application" | "database" | "essential" | "migration" | "transport")[];
/**
 * Plugin Types
 * @memberof Microfleet
 */
export declare const PluginTypes: {
    application: "application";
    database: "database";
    essential: "essential";
    transport: "transport";
};
/**
 * Plugin boot priority
 * @memberof Microfleet
 */
export declare const PluginsPriority: ("application" | "database" | "essential" | "transport")[];
/**
 * Helper method to enable router extensions.
 * @param name - Pass extension name to require.
 * @returns Extension to router plugin.
 */
export declare const routerExtension: (name: string) => unknown;
/**
 * Healthcheck statuses
 */
export { PLUGIN_STATUS_OK, PLUGIN_STATUS_FAIL } from './constants';
/**
 * Interface for optional params
 */
export interface ConfigurationOptional {
    /**
     * List of plugins to be enabled
     */
    plugins: string[];
    /**
     * Validator plugin configuration
     */
    validator: ValidatorConfig;
    /**
     * Router configuration
     */
    router: RouterConfig;
    /**
    * Arbitrary hooks to be executed asynchronously
    */
    hooks: {
        [name: string]: Hook;
    };
}
export declare type AnyFn = (...args: any[]) => any;
export declare type Hook = EventEmitter.ListenerFn | EventEmitter.ListenerFn[];
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
export declare type CoreOptions = ConfigurationRequired & ConfigurationOptional;
/**
 * @class Microfleet
 */
export declare class Microfleet extends EventEmitter {
    static readonly version: string;
    config: CoreOptions;
    migrators: {
        [name: string]: AnyFn;
    };
    readonly plugins: string[];
    readonly [constants.CONNECTORS_PROPERTY]: StartStopTree;
    readonly [constants.DESTRUCTORS_PROPERTY]: StartStopTree;
    readonly [constants.HEALTH_CHECKS_PROPERTY]: PluginHealthCheck[];
    private connectorToPlugin;
    /**
     * Allow Extensions
     */
    [property: string]: any;
    /**
     * @param [opts={}] - Overrides for configuration.
     * @returns Instance of microservice.
     */
    constructor(opts: ConfigurationRequired & DeepPartial<ConfigurationOptional>);
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
    hook(event: string, ...args: unknown[]): Promise<any[]>;
    /**
     * Adds migrators.
     * @param name - Migrator name.
     * @param fn - Migrator function to be invoked.
     * @param args - Arbitrary args to be passed to fn later on.
     */
    addMigrator(name: string, fn: AnyFn, ...args: any[]): void;
    /**
     * Performs migration for a given database or throws if migrator is not present.
     * @param  name - Name of the migration to invoke.
     * @param  args - Extra args to pass to the migrator.
     * @returns Result of the migration.
     */
    migrate(name: string, ...args: unknown[]): any;
    /**
     * Generic connector for all of the plugins.
     * @returns Walks over registered connectors and emits ready event upon completion.
     */
    connect(): Promise<unknown[]>;
    /**
     * Generic cleanup function.
     * @returns Walks over registered destructors and emits close event upon completion.
     */
    close(): Promise<any>;
    /**
     * Public function to init plugins.
     *
     * @param mod - Plugin module instance.
     * @param mod.name - Plugin name.
     * @param mod.attach - Plugin attach function.
     * @param [conf] - Configuration in case it's not present in the core configuration object.
     */
    initPlugin<T extends object>(mod: Plugin<T>, conf?: any): void;
    /**
     * Returns registered connectors.
     * @returns Connectors.
     */
    getConnectors(): StartStopTree;
    /**
     * Returns registered destructors.
     * @returns Destructors.
     */
    getDestructors(): StartStopTree;
    /**
     * Returns registered health checks.
     * @returns Health checks.
     */
    getHealthChecks(): PluginHealthCheck[];
    /**
     * Initializes connectors on the instance of Microfleet.
     * @param type - Connector type.
     * @param handler - Plugin connector.
     * @param plugin - name of the plugin, optional.
     */
    addConnector(type: TConnectorsTypes, handler: PluginConnector, plugin?: string): void;
    /**
     * Initializes destructor on the instance of Microfleet.
     * @param type - Destructor type.
     * @param handler - Plugin destructor.
     * @param plugin - name of the plugin, optional.
     */
    addDestructor(type: TConnectorsTypes, handler: PluginConnector, plugin?: string): void;
    /**
     * Initializes plugin health check.
     * @param {Function} handler - Health check function.
     */
    addHealthCheck(handler: PluginHealthCheck): void;
    /**
     * Asks for health status of registered plugins if it's possible, logs it and returns summary.
     */
    getHealthStatus(): Promise<HealthStatus>;
    hasPlugin(name: string): boolean;
    /**
     * Overrides SIG* events and exits cleanly.
     * @returns Resolves when exit sequence has completed.
     */
    private exit;
    /**
     * Helper for calling funcs and emitting event after.
     *
     * @param collection - Object with namespaces for arbitrary handlers.
     * @param event - Type of handlers that must be called.
     * @param [priority=Microfleet.ConnectorsPriority] - Order to process collection.
     * @returns Result of the invocation.
     */
    private processAndEmit;
    private addHandler;
    /**
     * Initializes service plugins.
     * @param {Object} config - Service plugins configuration.
     * @private
     */
    private initPlugins;
    private pluginComparator;
    /**
     * Notifies about errors when no other listeners are present
     * by throwing them.
     * @param err - Error that was emitted by the service members.
     */
    private onError;
}
