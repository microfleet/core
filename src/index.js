// @flow

/**
 * Types
 */
import type { Plugin, PluginInterface, PluginConnector, HandlerProperties, ConnectorsTypes } from './types';

/**
 * Third-party deps
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
 */
const constants = require('./constants');
const defaultOpts = require('./defaults');

/**
 * @namespace Mservice
 */
class Mservice extends EventEmitter {

  /**
   * Constants with possilble transport values
   * @type {{amqp: string, http: string, socketIO: string}}
   */
  static ActionTransport = constants.ActionTransport;

  /**
   * Constants with connect types to control order of service bootstrap
   * @type {Object}
   */
  static ConnectorsTypes = constants.ConnectorsTypes;

  /**
   * Default priority of connectors during bootstrap
   * @type {Array}
   */
  static ConnectorsPriority = constants.ConnectorsPriority;

  /**
   * Plugin Types
   * @type {Object}
   */
  static PluginsTypes = constants.PluginsTypes;

  /**
   * Plugin boot priority
   * @type {Array}
   */
  static PluginsPriority = constants.PluginsPriority;

  /**
   * Helper method to enable router extensions
   * @param  {String} name
   * @return {Module}
   */
  static routerExtension(name) {
    // eslint-disable-next-line import/no-dynamic-require
    return require(`./plugins/router/extensions/${name}`);
  }

  /**
   * These namespaces are reserved by plugins or core funcs
   * of mservice fleet
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
   * @namespace Users
   * @param  {Object} opts
   * @return {Users}
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
   * Overrides SIG* events and exits cleanly
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
   * asyncronously calls event listeners
   * and waits for them to complete.
   * This is a bit odd compared to normal event listeners,
   * but works well for dynamically running async actions and waiting
   * for them to complete
   *
   * @param  {String} event
   * @param  {Mixed}  ...args
   * @return {Promise}
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
   * Adds migrators
   */
  addMigrator(name: string, fn: () => mixed, ...args: Array<any>) {
    this._migrators[name] = partial(fn, ...args);
  }

  /**
   * Performs migration for a given database or throws if migrator is not present
   */
  migrate(name: string, ...args: Array<any>) {
    const migrate = this._migrators[name];
    assert(is.fn(migrate), `migrator ${name} not defined`);
    return migrate(...args);
  }

  /**
   * Defines convinience getters
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
   *
   */
  _get(name: string) {
    const it = this[`_${name}`];
    if (it) {
      return it;
    }

    return this.emit('error', new Errors.NotPermittedError(`${name} was not initialized`));
  }

  /**
   * Generic connector for all of the plugins
   * @return {Promise}
   */
  connect() {
    return this._processAndEmit(this.getConnectors(), 'ready');
  }

  /**
   * Generic cleanup function
   * @return {Promise}
   */
  close() {
    return this._processAndEmit(this.getDesturctors(), 'close');
  }

  /**
   * Helper for calling funcs and emitting event after
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
   * Public function to init plugins
   *
   * @param  {Object} mod
   * @param  {String} mod.name
   * @param  {Function} mod.attach
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

  getConnectors() {
    return this[constants.CONNECTORS_PROPERTY];
  }

  getDesturctors() {
    return this[constants.DESTRUCTORS_PROPERTY];
  }

  addConnector(type: ConnectorsTypes, handler: PluginConnector) {
    this._addHandler(constants.CONNECTORS_PROPERTY, type, handler);
  }

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
   * Initializes service plugins
   * @param  {Object} config
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
   * by throwing them
   * @param  {Error} err
   */
  _onError(err: Error) {
    if (this.listeners('error').length > 1) {
      return;
    }

    throw err;
  }
}

module.exports = Mservice;
