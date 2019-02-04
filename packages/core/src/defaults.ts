import path = require('path')
import * as constants from './constants'
import { RouterConfig, LifecyclePoints } from './plugins/router/factory'

/**
 * This extension defaults schemas to the name of the action
 */
import autoSchema from './plugins/router/extensions/validate/schemaLessAction'

/**
 * Provides audit log for every performed action
 */
import auditLog from './plugins/router/extensions/audit/log'

/**
 * Default configurations module
 * @module mservice:defaults
 */

/**
 * Settigs for Logger plugin
 */
export const logger = {
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
}

/**
 * Default plugins that each service would likely require
 * It's advised to revamp this per your project
 */
export const plugins = [
  'validator',
  'logger',
  'router',
  'http',
]

/**
 * Default Router configuration.
 */
export const router: Partial<RouterConfig> = {
  /**
   * Routes configuration
   */
  routes: {
    /**
     * Directory to scan for actions.
     */
    directory: path.resolve(process.cwd(), 'src/actions'),

    /**
     * When set to empty object, will scan directory
     */
    enabled: Object.create(null),

    /**
     * Prefix for actions, it's added after transport-specific configuration
     */
    prefix: '',

    /**
     * Sets transports defined here as default ones for action.
     */
    setTransportsAsDefault: true,

    /**
     * Initialize that array of transports
     */
    transports: [constants.ActionTransport.http],

    /**
     * Enables health action by default
     */
    enabledGenericActions: [
      'health',
    ],
  },

  /**
   * Extensions configuration
   */
  extensions: {
    /**
     * Enabled extension points
     */
    enabled: [LifecyclePoints.postRequest, LifecyclePoints.preRequest, LifecyclePoints.preResponse],

    /**
     * Enabled plugins
     */
    register: [autoSchema, auditLog()],
  },
}

/**
 * Default HTTP Plugin Configuration
 */
export const http = {
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
     */
    enabled: true,

    /**
     * Will be used as <http.router.prefix>/<router.routes.prefix>/<actionName>
     * If any of the prefixes are empty strings - they are omitted
     */
    prefix: 'mservice',
  },
}

/**
 * Contains function definitions for service-specific hooks
 */
export const hooks = {}

/**
 * Contains amqp plugin configuration
 */
export const amqp = {
  /**
   * @microfleet/transport-amqp configuration
   * @type {Object}
   */
  transport: {

  },

  /**
   * Router adapter configuration
   */
  router: {
    enabled: false,
  },
}

/**
 * Enables graceful handling of shutdown for supported plugins
 */
export const sigterm = true

/**
 * Opentracing configuration
 */
export const opentracing = {
  config: {
    disable: true,
    serviceName: 'microfleet',
  },
}

export const prometheus = {
  config: {
    port: 9102,
    path: '/metrics',
    host: 'localhost'
  },
}

/**
 * Health check retry options
 * https://www.npmjs.com/package/bluebird-retry
 */
export const healthChecks = {
  interval: 500,
  max_tries: 3,
}
