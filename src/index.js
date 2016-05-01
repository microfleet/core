const Promise = require('bluebird');
const Errors = require('common-errors');
const EventEmitter = require('eventemitter3');
const forOwn = require('lodash/forOwn');
const each = require('lodash/each');
const deprecate = require('deprecate-me');
const is = require('is');

/**
 * Configuration options for the service
 * @type {Object}
 */
const defaultOpts = {
  debug: process.env.NODE_ENV === 'development',
  logger: false,
  plugins: ['validator', 'logger', 'amqp'],
  hooks: {},
  sigterm: true,
};

/**
 * @namespace Mservice
 */
class Mservice extends EventEmitter {

  /**
   * @namespace Users
   * @param  {Object} opts
   * @return {Users}
   */
  constructor(opts = {}) {
    super();

    // init configuration
    const config = this._config = { ...defaultOpts, ...opts };

    // init plugins
    this._initPlugins(config);

    // setup error listener
    this.on('error', err => {
      this._onError(err);
    });

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
    process.stdout.write('received close signal...\n closing connections...\n');
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
   * Deprecated, use .hook
   */
  postHook(...args) {
    deprecate({
      since: '1.7.0',
      name: 'postHook',
      removed: '2.0.0',
      replaceBy: 'hook',
      message: 'was renamed to better reflect intention of the function',
    });

    // pass control to renamed function
    return this.hook(...args);
  }

  /**
   * General configuration object
   */
  get config() {
    return this._get('config');
  }

  /**
   * Getter for amqp connection
   * @return {Object}
   */
  get amqp() {
    return this._get('amqp');
  }

  /**
   * Getter for redis connection
   * @return {Object}
   */
  get redis() {
    return this._get('redis');
  }

  /**
   * Getter for validator plugin
   * @return {Object}
   */
  get validator() {
    return this._get('validator');
  }

  /**
   * Getter for logger plugin
   * @return {Object}
   */
  get log() {
    return this._get('log');
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
  _processAndEmit(arr, event) {
    return Promise
      .map(arr, func => func())
      .tap(() => {
        this.emit(event);
      });
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

    if (is.nil(expose) || !is.object(expose)) {
      return;
    }

    const { connect, close } = expose;

    if (is.fn(connect)) {
      this._connectors.push(connect);
    }

    if (is.fn(close)) {
      this._destructors.push(close);
    }
  }

  // ***************************** Plugin section: private **************************************

  /**
   * Initializes service plugins
   * @param  {Object} config
   */
  _initPlugins(config) {
    this._connectors = [];
    this._destructors = [];

    // init plugins
    config.plugins.forEach(plugin => {
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
