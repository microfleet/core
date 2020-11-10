/**
 * This file exports constants used throughout the project
 * @module mservice:constants
 */

/**
 * Returns first arg that is passed to the function
 */
export const identity = <T>(arg: T): T => arg

/**
 * Connector property.
 */
export const CONNECTORS_PROPERTY = 'connectors'

/**
 * Destructor property.
 */
export const DESTRUCTORS_PROPERTY = 'destructors'

/**
 * Health checks property
 */
export const HEALTH_CHECKS_PROPERTY = 'healthChecks'

/**
 * Constants with possilble transport values
 * @todo plugin-router
 */
export const ActionTransport = {
  amqp: 'amqp',
  http: 'http',
  internal: 'internal',
  socketio: 'socketio',
} as const

// based on this we validate input data
// @todo plugin-router
export const DATA_KEY_SELECTOR = {
  amqp: 'params',
  delete: 'query',
  get: 'query',
  head: 'query',
  internal: 'params',
  patch: 'params',
  post: 'params',
  put: 'params',
  socketio: 'params',
} as const

/**
 * Constants with connect types to control order of service bootstrap
 */
export const ConnectorsTypes = {
  application: 'application',
  database: 'database',
  essential: 'essential',
  migration: 'migration',
  transport: 'transport',
} as const

/**
 * Plugin Types
 */
export const PluginTypes = {
  application: 'application',
  database: 'database',
  essential: 'essential',
  transport: 'transport',
} as const

/**
 * Default priority of connectors during bootstrap
 */
export const ConnectorsPriority = [
  ConnectorsTypes.essential,
  ConnectorsTypes.database,
  ConnectorsTypes.migration,
  ConnectorsTypes.transport,
  ConnectorsTypes.application,
]

/**
 * Plugin boot priority
 */
export const PluginsPriority = [
  PluginTypes.essential,
  PluginTypes.database,
  PluginTypes.transport,
  PluginTypes.application,
]

export const PLUGIN_STATUS_OK = 'ok' as const
export const PLUGIN_STATUS_FAIL = 'fail' as const
