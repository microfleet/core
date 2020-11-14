import { ValidatorConfig } from './plugins/validator'

/**
 * Default configurations module
 * @module mservice:defaults
 */

export const validator: Partial<ValidatorConfig> = {
  schemas: [],
  serviceConfigSchemaIds: ['microfleet.core', 'config'],
  filter: null,
  ajv: {
    strictKeywords: true,
  },
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
  'router-http',
]

/**
 * Contains function definitions for service-specific hooks
 */
export const hooks = {}

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
