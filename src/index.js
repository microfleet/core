const Promise = require('bluebird');
const Errors = require('common-errors');
const EventEmitter = require('eventemitter3');
const forOwn = require('lodash/forOwn');
const each = require('lodash/each');
const mapValues = require('lodash/mapValues');
const flatten = require('lodash/flatten');
const values = require('lodash/values');
const is = require('is');
const stdout = require('stdout-stream');
const partial = require('lodash/partial');
const assert = require('assert');

/**
 * Configuration options for the service
 * @type {Object}
 */
const defaultOpts = {
  debug: process.env.NODE_ENV !== 'production',
  logger: false,
  plugins: ['validator', 'logger', 'amqp'],
  hooks: {},
  amqp: {},
  sigterm: true,
};

/**
 * @namespace Mservice
 */
class Mservice extends EventEmitter {
  /**
   * @type {{amqp: string, http: string, socketIO: string}}
   */
  static ActionTransport = {
    amqp: 'amqp',
    http: 'http',
    socketIO: 'socketIO',
  };

  /**
   * Warning, plugins order by priority
   */
  static PluginsTypes = {
    essential: 'essential',
    database: 'database',
    transport: 'transport',
  }

  static routerExtension(name) {
    return require(`./plugins/router/extensions/${name}`);
  }

  /**
   * @namespace Users
   * @param  {Object} opts
   * @return {Users}
   */
  constructor(opts = {}) {
    super();

    // init configuration
    const config = this._config = { ...defaultOpts, ...opts };

    // init getters
    [
      'config', 'amqp', 'redis',
      'validator', 'log', 'elasticsearch',
      'cassandra', 'http', 'socketIO',
      'router',
    ].map(prop => this._defineGetter(prop));

    // init plugins
    this._initPlugins(config);

    // setup error listener
    this.on('error', (err) => {
      this._onError(err);
    });

    // setup hooks
    forOwn(config.hooks, (_hooks, eventName) => {
      const hooks = Array.isArray(_hooks) ? _hooks : [_hooks];
      each(hooks, hook => this.on(eventName, hook));
    });

    // init migrations
    this._migrators = {};

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
  hook(event, ...args) {
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
  addMigrator(name, fn, ...args) {
    this._migrators[name] = partial(fn, ...args);
  }

  /**
   * Performs migration for a given database or throws if migrator is not present
   */
  migrate(name, ...args) {
    const migrate = this._migrators[name];
    assert(is.fn(migrate), `migrator ${name} not defined`);
    return migrate(...args);
  }

  /**
   * Defines convinience getters
   */
  _defineGetter(name) {
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
  _get(name) {
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
    return this._processAndEmit(this._connectors, 'ready');
  }

  /**
   * Generic cleanup function
   * @return {Promise}
   */
  close() {
    return this._processAndEmit(this._destructors, 'close');
  }

  /**
   * Helper for calling funcs and emitting event after
   */
  _processAndEmit(collection, event) {
    return Promise
      .mapSeries(values(collection), arr => Promise.map(arr, func => func()))
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
  initPlugin(mod, conf) {
    const expose = mod.attach.call(this, conf || this._config[mod.name], __filename);

    if (!is.object(expose)) {
      return;
    }

    const { connect, close } = expose;

    if (is.fn(connect)) {
      this._connectors[mod.type].push(connect);
    }

    if (is.fn(close)) {
      this._destructors[mod.type].unshift(close);
    }
  }

  // ***************************** Plugin section: private **************************************

  /**
   * Initializes service plugins
   * @param  {Object} config
   */
  _initPlugins(config) {
    this._connectors = {};
    this._destructors = {};

    mapValues(Mservice.PluginsTypes, (pluginType) => {
      this._connectors[pluginType] = [];
      this._destructors[pluginType] = [];
    });

    // init plugins
    config.plugins.forEach((plugin) => {
      this.initPlugin(require(`./plugins/${plugin}`));
    });

    this.emit('init');
  }

  /**
   * Notifies about errors when no other listeners are present
   * by throwing them
   * @param  {Object} err
   */
  _onError(err) {
    if (this.listeners('error').length > 1) {
      return;
    }

    throw err;
  }
}

module.exports = Mservice;
