/**
 * This file exports constants used throughout the project
 * @module mservice:constants
 */

/* Some helpers */
export type Primitive = string | number | boolean | undefined | null
export function literal<T extends Primitive>(value: T): T {
  return value
}

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
 */
export const ActionTransport = {
  amqp: literal('amqp'),
  http: literal('http'),
  internal: literal('internal'),
  socketIO: literal('socketIO'),
}

// based on this we validate input data
export const DATA_KEY_SELECTOR = {
  amqp: literal('params'),
  delete: literal('query'),
  get: literal('query'),
  head: literal('query'),
  internal: literal('params'),
  patch: literal('params'),
  post: literal('params'),
  put: literal('params'),
  socketio: literal('params'),
}

/**
 * Constants with connect types to control order of service bootstrap
 */
export const ConnectorsTypes = {
  application: literal('application'),
  database: literal('database'),
  essential: literal('essential'),
  migration: literal('migration'),
  transport: literal('transport'),
}

/**
 * Plugin Types
 */
export const PluginTypes = {
  application: literal('application'),
  database: literal('database'),
  essential: literal('essential'),
  transport: literal('transport'),
}

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

export const PLUGIN_STATUS_OK = 'ok'
export const PLUGIN_STATUS_FAIL = 'fail'

export const kReplyHeaders = Symbol.for('microfleet:replyHeaders')
