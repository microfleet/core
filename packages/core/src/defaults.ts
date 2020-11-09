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
    prefix: '',
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
