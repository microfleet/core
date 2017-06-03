// @flow

import type { LifecycleRequestType } from '../../../types';

const Errors = require('common-errors');
const is = require('is');
const Promise = require('bluebird');

/**
 * Type definitions
 */
export type ExtensionPlugin = {
  point: LifecycleRequestType,
  handler: () => mixed,
};

export type ExtensionsConfig = {
  enabled: Array<string>,
  register: Array<Array<ExtensionPlugin>>
};

/**
 * Helpers.
 * @param {mixed} arg - Wrap into array if it is not.
 * @returns {Array<*>} Wrappe array.
 */
function convertToArrayIfNot(arg) {
  if (is.array(arg) === false) {
    return Promise.resolve([arg]);
  }

  return Promise.resolve(arg);
}

/**
 * @class Extensions
 * @param {Object} config - Extensions configuration object.
 * @param {Array}  config.enabled - Enabled lifecycle events.
 * @param {Object} config.register - Extensions to register.
 */
class Extensions {
  extensions: {
    [extension_name: string]: Array<() => mixed>
  };

  constructor(config: ExtensionsConfig = { enabled: [], register: [] }) {
    const { enabled, register } = config;
    const extensions = {};

    enabled.forEach((extension) => {
      extensions[extension] = [];
    });

    this.extensions = extensions;
    this.autoRegister(register);
  }

  autoRegister(register: Array<Array<ExtensionPlugin>>) {
    register.forEach((extensions) => {
      extensions.forEach(extension => this.register(extension.point, extension.handler));
    });
  }

  /**
   * Checks for existence of the extension handler name.
   * @param {string} name - Name of the extension handler.
   * @returns {boolean} True if exists.
   */
  has(name: LifecycleRequestType) {
    const handlers = this.extensions[name];

    return handlers !== undefined && handlers.length > 0;
  }

  /**
   * Registeres handler of the lifecycle event.
   * @param {string} name - Name of the lifecycle event.
   * @param {Function} handler - Handler of the event.
   */
  register(name: LifecycleRequestType, handler: () => mixed) {
    if (this.extensions[name] === undefined) {
      throw new Errors.NotSupportedError(name);
    }

    this.extensions[name].push(handler);
  }

  /**
   * Executes handlers for the lifecycle event.
   * @param {string} name - Name of the lifecycle event.
   * @param {Array<mixed>} args - Arguments to pass to lifecycle handlers.
   * @param {Mixed} [context=null] - Context to call lifecycle handlers with.
   * @returns {Promise<*>} Result of the invocation.
   */
  exec(name: string, args: Array<any> = [], context: mixed = null) {
    const handlers = this.extensions[name];

    if (is.undefined(handlers) === true) {
      return Promise.reject(new Errors.NotSupportedError(name));
    }

    if (is.array(args) === false) {
      return Promise.reject(new Errors.ArgumentError('"args" must be array'));
    }

    return Promise
      .resolve(handlers)
      .reduce((previousArgs, handler) => (
        convertToArrayIfNot(previousArgs).bind(context).spread(handler)
      ), args)
      .then(convertToArrayIfNot);
  }
}

module.exports = Extensions;
