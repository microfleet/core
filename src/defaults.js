// @flow

/**
 * Configuration options for the service
 * @type {Object}
 */

/**
 * Settigs for Logger plugin
 * @type {Object}
 */
exports.logger = {
  /**
   * anything thats not production will include extra logs
   * @type {Boolean}
   */
  debug: process.env.NODE_ENV !== 'production',

  /**
   * Enables default logger to stdout
   * @type {Boolean}
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
 * @type {Boolean}
 */
exports.sigterm = true;
