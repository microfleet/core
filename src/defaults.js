// @flow

/**
 * Default configurations module
 * @module mservice:defaults
 */

/**
 * Settigs for Logger plugin
 * @type {Object}
 */
exports.logger = {
  /**
   * anything thats not production will include extra logs
   * @type {boolean}
   */
  debug: process.env.NODE_ENV !== 'production',

  /**
   * Enables default logger to stdout
   * @type {boolean}
   */
  defaultLogger: true,
};

/**
 * Default plugins that each service would likely require
 * It's advised to revamp this per your project
 * @type {Array}
 */
exports.plugins = [
  'validator',
  'logger',
  'amqp',
];

/**
 * Contains function definitions for service-specific hooks
 * @type {Object}
 */
exports.hooks = {};

/**
 * Contains amqp plugin configuration
 * @type {Object}
 */
exports.amqp = {};

/**
 * Enables graceful handling of shutdown for supported plugins
 * @type {boolean}
 */
exports.sigterm = true;
