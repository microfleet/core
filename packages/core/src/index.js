"use strict";
/**
 * Microservice Abstract Class
 * @module Microfleet
 */
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
const Bluebird = require("bluebird");
const EventEmitter = require("eventemitter3");
const is = require("is");
const constants = require("./constants");
const defaultOpts = require("./defaults");
const validation_1 = require("@microfleet/validation");
const pluginHealthStatus_1 = require("./utils/pluginHealthStatus");
const packageInfo_1 = require("./utils/packageInfo");
const defaults_deep_1 = require("./utils/defaults-deep");
const toArray = (x) => Array.isArray(x) ? x : [x];
/**
 * Constants with possilble transport values
 * @memberof Microfleet
 */
exports.ActionTransport = constants.ActionTransport;
/**
 * Constants with connect types to control order of service bootstrap
 * @memberof Microfleet
 */
exports.ConnectorsTypes = constants.ConnectorsTypes;
/**
 * Default priority of connectors during bootstrap
 * @memberof Microfleet
 */
exports.ConnectorsPriority = constants.ConnectorsPriority;
/**
 * Plugin Types
 * @memberof Microfleet
 */
exports.PluginTypes = constants.PluginTypes;
/**
 * Plugin boot priority
 * @memberof Microfleet
 */
exports.PluginsPriority = constants.PluginsPriority;
/**
 * Helper method to enable router extensions.
 * @param name - Pass extension name to require.
 * @returns Extension to router plugin.
 */
exports.routerExtension = (name) => {
    return require(require.resolve(`./plugins/router/extensions/${name}`)).default;
};
/**
 * Healthcheck statuses
 */
var constants_1 = require("./constants");
exports.PLUGIN_STATUS_OK = constants_1.PLUGIN_STATUS_OK;
exports.PLUGIN_STATUS_FAIL = constants_1.PLUGIN_STATUS_FAIL;
function resolveModule(cur, path) {
    if (cur != null) {
        return cur;
    }
    try {
        return require(require.resolve(path));
    }
    catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            console.error(e);
        }
        return null;
    }
}
/**
 * @class Microfleet
 */
class Microfleet extends EventEmitter {
    /**
     * @param [opts={}] - Overrides for configuration.
     * @returns Instance of microservice.
     */
    constructor(opts) {
        super();
        /**
         * Notifies about errors when no other listeners are present
         * by throwing them.
         * @param err - Error that was emitted by the service members.
         */
        this.onError = (err) => {
            if (this.listeners('error').length > 1) {
                return;
            }
            throw err;
        };
        // init configuration
        this.config = defaults_deep_1.default(opts, defaultOpts);
        this.exit = this.exit.bind(this);
        // init migrations
        this.migrators = Object.create(null);
        this.connectorToPlugin = new Map();
        // init health status checkers
        this[constants.HEALTH_CHECKS_PROPERTY] = [];
        // init plugins
        this.plugins = [];
        this[constants.CONNECTORS_PROPERTY] = Object.create(null);
        this[constants.DESTRUCTORS_PROPERTY] = Object.create(null);
        // setup error listener
        this.on('error', this.onError);
        this.initPlugins(this.config);
        // setup hooks
        for (const [eventName, hooks] of Object.entries(this.config.hooks)) {
            for (const hook of toArray(hooks)) {
                this.on(eventName, hook);
            }
        }
        if (this.config.sigterm) {
            this.on('ready', () => {
                process.once('SIGTERM', this.exit);
                process.once('SIGINT', this.exit);
            });
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
    async hook(event, ...args) {
        const listeners = this.listeners(event);
        const work = [];
        for (const listener of listeners.values()) {
            work.push(listener.apply(this, args));
        }
        return Promise.all(work);
    }
    /**
     * Adds migrators.
     * @param name - Migrator name.
     * @param fn - Migrator function to be invoked.
     * @param args - Arbitrary args to be passed to fn later on.
     */
    addMigrator(name, fn, ...args) {
        this.migrators[name] = (...migratorArgs) => fn.call(this, ...args, ...migratorArgs);
    }
    /**
     * Performs migration for a given database or throws if migrator is not present.
     * @param  name - Name of the migration to invoke.
     * @param  args - Extra args to pass to the migrator.
     * @returns Result of the migration.
     */
    migrate(name, ...args) {
        const migrate = this.migrators[name];
        assert_1.strict(is.fn(migrate), `migrator ${name} not defined`);
        return migrate(...args);
    }
    /**
     * Generic connector for all of the plugins.
     * @returns Walks over registered connectors and emits ready event upon completion.
     */
    async connect() {
        return this.processAndEmit(this.getConnectors(), 'ready', exports.ConnectorsPriority);
    }
    /**
     * Generic cleanup function.
     * @returns Walks over registered destructors and emits close event upon completion.
     */
    async close() {
        return this.processAndEmit(this.getDestructors(), 'close', [...exports.ConnectorsPriority].reverse());
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
    initPlugin(mod, conf) {
        const pluginName = mod.name;
        let expose;
        try {
            expose = mod.attach.call(this, conf || this.config[mod.name], __filename);
        }
        catch (e) {
            if (e.constructor === validation_1.HttpStatusError) {
                e.message = `[@microfleet/core] Could not attach ${mod.name}:\n${e.message}`;
            }
            throw e;
        }
        this.plugins.push(pluginName);
        if (!is.object(expose)) {
            return;
        }
        const { connect, status, close } = expose;
        const type = exports.ConnectorsTypes[mod.type];
        assert_1.strict(type, 'Plugin type must be equal to one of connectors type');
        if (typeof connect === 'function') {
            this.addConnector(type, connect, pluginName);
        }
        if (typeof close === 'function') {
            this.addDestructor(type, close, pluginName);
        }
        if (typeof status === 'function') {
            this.addHealthCheck(new pluginHealthStatus_1.PluginHealthCheck(mod.name, status));
        }
    }
    /**
     * Returns registered connectors.
     * @returns Connectors.
     */
    getConnectors() {
        return this[constants.CONNECTORS_PROPERTY];
    }
    /**
     * Returns registered destructors.
     * @returns Destructors.
     */
    getDestructors() {
        return this[constants.DESTRUCTORS_PROPERTY];
    }
    /**
     * Returns registered health checks.
     * @returns Health checks.
     */
    getHealthChecks() {
        return this[constants.HEALTH_CHECKS_PROPERTY];
    }
    /**
     * Initializes connectors on the instance of Microfleet.
     * @param type - Connector type.
     * @param handler - Plugin connector.
     * @param plugin - name of the plugin, optional.
     */
    addConnector(type, handler, plugin) {
        this.addHandler(constants.CONNECTORS_PROPERTY, type, handler, plugin);
    }
    /**
     * Initializes destructor on the instance of Microfleet.
     * @param type - Destructor type.
     * @param handler - Plugin destructor.
     * @param plugin - name of the plugin, optional.
     */
    addDestructor(type, handler, plugin) {
        this.addHandler(constants.DESTRUCTORS_PROPERTY, type, handler, plugin);
    }
    /**
     * Initializes plugin health check.
     * @param {Function} handler - Health check function.
     */
    addHealthCheck(handler) {
        this[constants.HEALTH_CHECKS_PROPERTY].push(handler);
    }
    /**
     * Asks for health status of registered plugins if it's possible, logs it and returns summary.
     */
    getHealthStatus() {
        return pluginHealthStatus_1.getHealthStatus.call(this, this.getHealthChecks(), this.config.healthChecks);
    }
    hasPlugin(name) {
        return this.plugins.includes(name);
    }
    /**
     * Overrides SIG* events and exits cleanly.
     * @returns Resolves when exit sequence has completed.
     */
    async exit() {
        this.log.info('received close signal... closing connections...');
        try {
            await Promise.race([
                this.close(),
                Bluebird.delay(10000).throw(new Bluebird.TimeoutError('failed to close after 10 seconds')),
            ]);
        }
        catch (e) {
            this.log.error({ error: e }, 'Unable to shutdown');
            process.exit(128);
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
    async processAndEmit(collection, event, priority = exports.ConnectorsPriority) {
        const responses = [];
        for (const connectorType of priority) {
            const connectors = collection[connectorType];
            if (!connectors) {
                continue;
            }
            for (const handler of connectors) {
                const pluginName = this.connectorToPlugin.get(handler);
                if (this.log) {
                    this.log.info({ pluginName, connectorType, event }, 'started');
                }
                responses.push(await handler.call(this));
                if (this.log) {
                    this.log.info({ pluginName, connectorType, event }, 'completed');
                }
            }
        }
        this.emit(event);
        return responses;
    }
    // ***************************** Plugin section: private **************************************
    addHandler(property, type, handler, plugin) {
        if (this[property][type] === undefined) {
            this[property][type] = [];
        }
        this[property][type].push(handler);
        if (plugin) {
            this.connectorToPlugin.set(handler, plugin);
        }
    }
    /**
     * Initializes service plugins.
     * @param {Object} config - Service plugins configuration.
     * @private
     */
    initPlugins(config) {
        for (const pluginType of exports.PluginsPriority) {
            this[constants.CONNECTORS_PROPERTY][pluginType] = [];
            this[constants.DESTRUCTORS_PROPERTY][pluginType] = [];
        }
        // require all modules
        const plugins = [];
        for (const plugin of config.plugins) {
            const paths = [`./plugins/${plugin}`, `@microfleet/plugin-${plugin}`];
            const pluginModule = paths.reduce(resolveModule, null);
            if (pluginModule === null) {
                throw new Error(`failed to init ${plugin}`);
            }
            plugins.push(pluginModule);
        }
        // sort and ensure that they are attached based
        // on their priority
        plugins.sort(this.pluginComparator);
        // call the .attach function
        for (const plugin of plugins) {
            this.initPlugin(plugin);
        }
        this.emit('init');
    }
    pluginComparator(a, b) {
        const ap = exports.PluginsPriority.indexOf(a.type);
        const bp = exports.PluginsPriority.indexOf(b.type);
        // same plugin type, check priority
        if (ap === bp) {
            if (a.priority < b.priority)
                return -1;
            if (a.priority > b.priority)
                return 1;
            return 0;
        }
        // different plugin types, sort based on it
        if (ap < bp)
            return -1;
        return 1;
    }
}
exports.Microfleet = Microfleet;
constants.CONNECTORS_PROPERTY, constants.DESTRUCTORS_PROPERTY, constants.HEALTH_CHECKS_PROPERTY;
Microfleet.version = packageInfo_1.getVersion();
// if there is no parent module we assume it's called as a binary
if (!module.parent) {
    const mservice = new Microfleet({ name: 'cli' });
    mservice
        .connect()
        .catch((err) => {
        mservice.log.fatal('Failed to start service', err);
        setImmediate(() => { throw err; });
    });
}
//# sourceMappingURL=index.js.map