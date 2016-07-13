const Errors = require('common-errors');
const Promise = require('bluebird');

class Extension
{
  constructor(service, extensions = {}) {
    this.extensions = Object.assign({
      preAuth: [],
      postAuth: [],
      preValidate: [],
      postValidate: [],
      preAllowed: [],
      postAllowed: [],
      preSocketIORequest: [],
    }, extensions);
    this.service = service;
  }

  has(name) {
    const handlers = this.extensions[name];

    if (handlers === undefined) {
      throw new Errors.NotSupportedError(name);
    }

    return handlers.length > 0;
  }

  register(name, handler) {
    if (this.extensions[name] === undefined) {
      throw new Errors.NotSupportedError(name);
    }

    this.extensions[name].push(handler);
  }

  exec(name, ...args) {
    const handlers = this.extensions[name];

    if (handlers === undefined) {
      throw new Errors.NotSupportedError(name);
    }

    args.push(this.service);

    return Promise.map(handlers, handler => handler(...args));
  }
}

module.exports = Extension;
