/**
 * Default plugins that each service would likely require
 * It's advised to revamp this per your project
 */
export const plugins = [
  'validator',
  'logger',
  'router',
  'hapi',
  'router-hapi',
]

/**
 * Contains function definitions for service-specific hooks
 */
export const hooks = {}

/**
 * Enables graceful handling of shutdown for supported plugins
 */
export const sigterm = true

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
