const Errors = require('common-errors');
const Promise = require('bluebird');

class Extensions {
  constructor(config = {}) {
    // @todo validate config
    // @todo remove
    if (!config.enabled) config.enabled = [];
    if (!config.register) config.register = {};

    const { enabled, register} = config;

    this.extensions = enabled.reduce((extensions, name) => {
      extensions[name] = [];

      return extensions;
    }, {});

    Object.keys(register).forEach(name => {
      register[name].forEach(handler => this.register(name, handler));
    });
  }

  has(name) {
    const handlers = this.extensions[name];

    return handlers !== undefined && handlers.length > 0;
  }

  register(name, handler) {
    if (this.extensions[name] === undefined) {
      throw new Errors.NotSupportedError(name);
    }

    this.extensions[name].push(handler);
  }

  exec(name, args) {
    const handlers = this.extensions[name];

    if (handlers === undefined) {
      throw new Errors.NotSupportedError(name);
    }

    return Promise.mapSeries(handlers, handler => handler(...args));
  }
}

module.exports = Extensions;
