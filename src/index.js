const Promise = require('bluebird');
const Errors = require('common-errors');
const EventEmitter = require('eventemitter3');
const ld = require('lodash');

/**
 * Configuration options for the service
 * @type {Object}
 */
const defaultOpts = {
  debug: process.env.NODE_ENV === 'development',
  logger: false,
  plugins: [ 'validator', 'logger', 'amqp' ],
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
    const config = this._config = ld.extend({}, defaultOpts, opts);
    this._initPlugins(config);
    this.on('error', err => {
      this._onError(err);
    });
  }

  /**
   * Getter for amqp connection
   * @return {Object}
   */
  get amqp() {
    const amqp = this._amqp;
    return amqp ? amqp : this.emit('error', new Errors.NotPermittedError('AMQP was not initialized'));
  }

  /**
   * Getter for redis connection
   * @return {Object}
   */
  get redis() {
    const redis = this._redis;
    return redis ? redis : this.emit('error', new Errors.NotPermittedError('Redis was not initialized'));
  }

  /**
   * Getter for validator plugin
   * @return {Object}
   */
  get validator() {
    const validator = this._validator;
    return validator ? validator : this.emit('error', new Errors.NotPermittedError('Validator was not initialized'));
  }

  /**
   * Getter for logger plugin
   * @return {Object}
   */
  get log() {
    const log = this._log;
    return log ? log : this.emit('error', new Errors.NotPermittedError('Logger was not initialized'));
  }

  /**
   * Generic connector for all of the plugins
   * @return {Promise}
   */
  connect() {
    return Promise.map(this._connectors, connect => {
      return connect();
    })
    .tap(() => {
      this.emit('ready');
    });
  }

  /**
   * Generic cleanup function
   * @return {Promise}
   */
  close() {
    return Promise.map(this._destructors, destructor => {
      return destructor();
    })
    .tap(() => {
      this.emit('close');
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

    if (!expose || typeof expose !== 'object') {
      return;
    }
    const { connect, close } = expose;

    if (typeof connect === 'function') {
      this._connectors.push(connect);
    }

    if (typeof close === 'function') {
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
