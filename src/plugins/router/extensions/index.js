const Errors = require('common-errors');
const is = require('is');
const Promise = require('bluebird');

function convertToArrayIfNot(arg) {
  if (is.array(arg) === false) {
    return Promise.resolve([arg]);
  }

  return Promise.resolve(arg);
}

/**
 *
 */
class Extensions {
  /**
   * @param {Object} config
   * @param {Array}  config.enabled
   * @param {Object} config.register
   */
  constructor(config = { enabled: [], register: [] }) {
    const { enabled, register } = config;
    const extensions = {};

    enabled.forEach(extension => {
      extensions[extension] = [];
    });

    this.extensions = extensions;
    this.autoRegister(register);
  }

  autoRegister(register) {
    register.forEach(extensions => {
      extensions.forEach(extension => this.register(extension.point, extension.handler));
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
   * @param context
   * @returns {Promise}
   */
  exec(name, args = [], context = null) {
    const handlers = this.extensions[name];

    if (is.undefined(handlers) === true) {
      return Promise.reject(new Errors.NotSupportedError(name));
    }

    if (is.array(args) === false) {
      return Promise.reject(new Errors.ArgumentError('"args" must be array'));
    }

    return Promise.resolve(handlers)
      .bind(context)
      .reduce((previousArgs, handler) => convertToArrayIfNot(previousArgs).spread(handler), args)
      .then(convertToArrayIfNot);
  }
}

module.exports = Extensions;
