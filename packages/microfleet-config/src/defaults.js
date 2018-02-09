// @flow

const path = require('path');
const constants = require('./constants');

/**
 * This extension defaults schemas to the name of the action
 * @type {Function}
 */
const autoSchema = require('@microfleet/plugin-router/src/extensions/validate/schemaLessAction');

/**
 * Provides audit log for every performed action
 * @type {Function}
 */
const auditLog = require('@microfleet/plugin-router/src/extensions/audit/log');

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
  'router',
  'http',
];

/**
 * Default Router configuration.
 * @type {Object}
 */
exports.router = {
  /**
   * Routes configuration
   * @type {Object}
   */
  routes: {
    /**
     * Directory to scan for actions.
     * @type {string}
     */
    directory: path.resolve(process.cwd(), 'src/actions'),

    /**
     * Prefix for actions, it's added after transport-specific configuration
     * @type {String}
     */
    prefix: '',

    /**
     * Sets transports defined here as default ones for action.
     * @type {Boolean}
     */
    setTransportsAsDefault: true,

    /**
     * Initialize that array of transports
     * @type {Array}
     */
    transports: [constants.ActionTransport.http],
  },
  /**
   * Extensions configuration
   * @type {Object}
   */
  extensions: {
    /**
     * Enabled extension points
     * @type {Array}
     */
    enabled: ['postRequest', 'preRequest', 'preResponse'],

    /**
     * Enabled plugins
     * @type {Array}
     */
    register: [autoSchema, auditLog],
  },
};

/**
 * Default HTTP Plugin Configuration
 * @type {Object}
 */
exports.http = {
  server: {
    /**
     * Use Hapi.js as server implementation, other options include express and restify
     * @type {String}
     */
    handler: 'hapi',

    /**
     * Do not include socket.io transport
     * @type {Boolean}
     */
    attachSocketIO: false,

    /**
     * Listen on port 3000
     * @type {Number}
     */
    port: 3000,
  },

  router: {
    /**
     * Enables router plugin for HTTP handler
     * @type {Boolean}
     */
    enabled: true,

    /**
     * Will be used as <http.router.prefix>/<router.routes.prefix>/<actionName>
     * If any of the prefixes are empty strings - they are omitted
     * @type {String}
     */
    prefix: 'mservice',
  },
};

/**
 * Contains function definitions for service-specific hooks
 * @type {Object}
 */
exports.hooks = {};

/**
 * Contains amqp plugin configuration
 * @type {Object}
 */
exports.amqp = {
  /**
   * @microfleet/transport-amqp configuration
   * @type {Object}
   */
  transport: {

  },
  /**
   * Router adapter configuration
   * @type {Object}
   */
  router: {
    enabled: false,
  },
};

/**
 * Enables graceful handling of shutdown for supported plugins
 * @type {boolean}
 */
exports.sigterm = true;

/**
 * Opentracing configuration
 * @type {object}
 */
exports.opentracing = {
  config: {
    serviceName: 'microfleet',
    disable: true,
  },
};
