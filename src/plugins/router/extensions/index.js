const Errors = require('common-errors');
const Promise = require('bluebird');

/**
 *
 */
class Extensions {
  /**
   * @param {Object} config
   * @param {Array}  config.enabled
   * @param {Object} config.register
   */
  constructor(config) {
    const { enabled, register } = config;
    const extensions = {};

    enabled.forEach(extension => {
      extensions[extension] = [];
    });

    this.extensions = extensions;

    Object.keys(register).forEach(name => {
      register[name].forEach(handler => this.register(name, handler));
    });
  }

  /**
   * @param {String} name
   * @returns {Boolean}
   */
  has(name) {
    const handlers = this.extensions[name];

    return handlers !== undefined && handlers.length > 0;
  }

  /**
   * @param {String} name
   * @param {Function} handler
   */
  register(name, handler) {
    if (this.extensions[name] === undefined) {
      throw new Errors.NotSupportedError(name);
    }

    this.extensions[name].push(handler);
  }

  /**
   * @param {String} name
   * @param {Array} args
   * @returns {Promise}
   */
  exec(name, args) {
    const handlers = this.extensions[name];

    if (handlers === undefined) {
      throw new Errors.NotSupportedError(name);
    }

    return Promise.mapSeries(handlers, handler => handler(...args));
  }
}

module.exports = Extensions;
