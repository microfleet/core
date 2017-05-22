// @flow

/**
 * Microservice Abstract Class
 * @module mservice
 */

/**
 * Types
 * @private
 */
import type { Plugin, PluginInterface, PluginConnector, HandlerProperties, ConnectorsTypes } from './types';

/**
 * Third-party deps
 * @private
 */
const Promise = require('bluebird');
const Errors = require('common-errors');
const EventEmitter = require('eventemitter3');
const forOwn = require('lodash/forOwn');
const each = require('lodash/each');
const flatten = require('lodash/flatten');
const is = require('is');
const stdout = require('stdout-stream');
const partial = require('lodash/partial');
const assert = require('assert');

/**
 * Local helpers and utils
 * @private
 */
const constants = require('./constants');
const defaultOpts = require('./defaults');

/**
 * @class Mservice
 */
class Mservice extends EventEmitter {

  /**
   * Constants with possilble transport values
   * @memberof Mservice
   * @type {Object}
   */
  static ActionTransport = constants.ActionTransport;

  /**
   * Constants with connect types to control order of service bootstrap
   * @memberof Mservice
   * @type {Object}
   */
  static ConnectorsTypes = constants.ConnectorsTypes;

  /**
   * Default priority of connectors during bootstrap
   * @memberof Mservice
   * @type {Array}
   */
  static ConnectorsPriority = constants.ConnectorsPriority;

  /**
   * Plugin Types
   * @memberof Mservice
   * @type {Object}
   */
  static PluginsTypes = constants.PluginsTypes;

  /**
   * Plugin boot priority
   * @memberof Mservice
   * @type {Array}
   */
  static PluginsPriority = constants.PluginsPriority;

  /**
   * Helper method to enable router extensions.
   * @param {string} name - Pass extension name to require.
   * @returns {Module} Extension to router plugin.
   */
  static routerExtension(name) {
    // eslint-disable-next-line import/no-dynamic-require
    return require(`./plugins/router/extensions/${name}`);
  }

  /**
   * These namespaces are reserved by plugins or core funcs
   * of mservice fleet
   * @memberof Mservice
   * @type {Array}
   */
  static reservedNamespaces = [
    'config',
    'amqp',
    'redis',
    'validator',
    'log',
    'elasticsearch',
    'cassandra',
    'http',
    'socketIO',
    'router',
    'knex',
  ];

  /**
   * @param {Object} [opts={}] - Overrides for configuration.
   * @returns {Mservice} Instance of microservice.
   */
  constructor(opts: Object = {}) {
    super();

    // init configuration
    const config = this._config = { ...defaultOpts, ...opts };

    // init getters
    Mservice.reservedNamespaces.map(prop => this._defineGetter(prop));

    // init migrations
    this._migrators = {};

    // bind onError
    this.onError = this._onError.bind(this);

    // init plugins
    this._initPlugins(config);

    // setup error listener
    this.on('error', this.onError);

    // setup hooks
    forOwn(config.hooks, (_hooks, eventName) => {
      const hooks = Array.isArray(_hooks) ? _hooks : [_hooks];
      each(hooks, hook => this.on(eventName, hook));
    });

    if (config.sigterm) {
      const exit = this.exit.bind(this);

      this.on('ready', () => {
        process.on('SIGTERM', exit);
      });

      this.on('close', () => {
        process.removeListener('SIGTERM', exit);
      });
    }
  }

  /**
   * Overrides SIG* events and exits cleanly.
   * @returns {Promise<void>} Resolves when exit sequence has completed.
   */
  exit() {
    stdout.write('received close signal...\n closing connections...\n');
    return this.close()
      .timeout(1000)
      .finally(() => {
        process.exit(0);
      });
  }

  /**
   * Asyncronously calls event listeners
   * and waits for them to complete.
   * This is a bit odd compared to normal event listeners,
   * but works well for dynamically running async actions and waiting
   * for them to complete.
   *
   * @param {string} event - Hook name to be called during execution.
   * @param {Mixed} args - Arbitrary args to pass to the hooks.
   * @returns {Promise<[*]>} Result of invoked hook.
   */
  hook(event: string, ...args: Array<any>) {
    const listeners = this.listeners(event);

    return Promise
      .bind(this)
      .return(listeners)
      .map(function performOp(listener) {
        return listener.apply(this, args);
      });
  }

  /**
   * Adds migrators.
   * @param {string} name - Migrator name.
   * @param {Function} fn - Migrator function to be invoked.
   * @param {Mixed} args - Arbitrary args to be passed to fn later on.
   */
  addMigrator(name: string, fn: () => mixed, ...args: Array<any>) {
    this._migrators[name] = partial(fn, ...args);
  }

  /**
   * Performs migration for a given database or throws if migrator is not present.
   * @param {string} name - Name of the migration to invoke.
   * @param {Mixed} args - Extra args to pass to the migrator.
   * @returns {Promise<*>} Result of the migration.
   */
  migrate(name: string, ...args: Array<any>) {
    const migrate = this._migrators[name];
    assert(is.fn(migrate), `migrator ${name} not defined`);
    return migrate(...args);
  }

  /**
   * Defines convinience getters.
   * @param {string} name - Getter name.
   * @private
   */
  _defineGetter(name: string) {
    Object.defineProperty(this, name, {
      __proto__: null,
      enumerable: true,
      configurable: false,
      get: () => this._get(name),
    });
  }

  /**
   * Convinience function to ensure that when a getter is called
   * that is not defined - it throws.
   * @param {string} name - Name of the service extension to get.
   * @private
   */
  _get(name: string) {
    const it = this[`_${name}`];
    if (it) {
      return it;
    }

    return this.emit('error', new Errors.NotPermittedError(`${name} was not initialized`));
  }

  /**
   * Generic connector for all of the plugins.
   * @returns {Promise<*>} Walks over registered connectors and emits ready event upon completion.
   */
  connect() {
    return this._processAndEmit(this.getConnectors(), 'ready');
  }

  /**
   * Generic cleanup function.
   * @returns {Promise} Walks over registered destructors and emits close event upon completion.
   */
  close() {
    return this._processAndEmit(this.getDesturctors(), 'close');
  }

  /**
   * Helper for calling funcs and emitting event after.
   * @private
   * @param {Object} collection - Object with namespaces for arbitrary handlers.
   * @param {string} event - Type of handlers that must be called.
   * @returns {Promise<*>} Result of the invocation.
   */
  _processAndEmit(collection: Object, event: string) {
    return Promise
      .mapSeries(
        Mservice.ConnectorsPriority,
        (connectorType) => {
          const connectors = collection[connectorType];

          if (!connectors) {
            return [];
          }

          return Promise.map(connectors, func => func());
        }
      )
      .then(result => flatten(result))
      .tap(() => this.emit(event));
  }

  // ****************************** Plugin section: public ************************************

  /**
   * Public function to init plugins.
   *
   * @param {Object} mod - Plugin module instance.
   * @param {string} mod.name - Plugin name.
   * @param {Function} mod.attach - Plugin attach function.
   * @param {Object} [conf] - Configuration in case it's not present in the core configuration object.
   */
  initPlugin(mod: Plugin, conf: ?Object) {
    const expose = mod.attach.call(this, conf || this._config[mod.name], __filename);

    if (!is.object(expose)) {
      return;
    }

    const { connect, close } = ((expose: any): PluginInterface);
    const type = Mservice.ConnectorsTypes[mod.type];

    assert(type, 'Plugin type must be equal to one of connectors type');

    if (is.fn(connect)) {
      this.addConnector(type, connect);
    }

    if (is.fn(close)) {
      this.addDestructor(type, close);
    }
  }

  /**
   * Returns registered connectors.
   * @returns {Object} Connectors.
   */
  getConnectors() {
    return this[constants.CONNECTORS_PROPERTY];
  }

  /**
   * Returns registered destructors.
   * @returns {Object} Destructors.
   */
  getDesturctors() {
    return this[constants.DESTRUCTORS_PROPERTY];
  }

  /**
   * Initializes connectors on the instance of Mservice.
   * @param {string} type - Connector type.
   * @param {Function} handler - Plugin connector.
   */
  addConnector(type: ConnectorsTypes, handler: PluginConnector) {
    this._addHandler(constants.CONNECTORS_PROPERTY, type, handler);
  }

  /**
   * Initializes destructor on the instance of Mservice.
   * @param {string} type - Destructor type.
   * @param {Function} handler - Plugin destructor.
   */
  addDestructor(type: ConnectorsTypes, handler: PluginConnector) {
    this._addHandler(constants.DESTRUCTORS_PROPERTY, type, handler);
  }

  // ***************************** Plugin section: private **************************************

  _addHandler(property: HandlerProperties, type: ConnectorsTypes, handler: () => mixed) {
    if (this[property] === undefined) {
      this[property] = {};
    }

    if (this[property][type] === undefined) {
      this[property][type] = [];
    }

    this[property][type].push(handler);
  }

  /**
   * Initializes service plugins.
   * @param {Object} config - Service plugins configuration.
   * @private
   */
  _initPlugins(config: Object) {
    this._connectors = {};
    this._destructors = {};

    Mservice.PluginsPriority
      .forEach((pluginType) => {
        this._connectors[pluginType] = [];
        this._destructors[pluginType] = [];
      });

    // init plugins
    config.plugins.forEach((plugin) => {
      // eslint-disable-next-line import/no-dynamic-require
      this.initPlugin(require(`./plugins/${plugin}`));
    });

    this.emit('init');
  }

  /**
   * Notifies about errors when no other listeners are present
   * by throwing them.
   * @param {Error} err - Error that was emitted by the service members.
   */
  _onError(err: Error) {
    if (this.listeners('error').length > 1) {
      return;
    }

    throw err;
  }
}

module.exports = Mservice;
