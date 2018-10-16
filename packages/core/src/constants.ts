/**
 * This file exports constants used throughout the project
 * @module mservice:constants
 */

/**
 * Connector property.
 */
export const CONNECTORS_PROPERTY = 'connectors';

/**
 * Destructor property.
 */
export const DESTRUCTORS_PROPERTY = 'destructors';

/**
 * Health checks property
 */
export const HEALTH_CHECKS_PROPERTY = 'healthChecks';

/**
 * Constants with possilble transport values
 */
export const ActionTransport = {
  amqp: 'amqp',
  http: 'http',
  internal: 'internal',
  socketIO: 'socketIO',
};

// based on this we validate input data
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
};

/**
 * Constants with connect types to control order of service bootstrap
 */
export const ConnectorsTypes = {
  application: 'application',
  database: 'database',
  essential: 'essential',
  migration: 'migration',
  transport: 'transport',
};

/**
 * Plugin Types
 */
export const PluginTypes = {
  database: 'database',
  essential: 'essential',
  transport: 'transport',
};

/**
 * Default priority of connectors during bootstrap
 */
export const ConnectorsPriority = [
  ConnectorsTypes.essential,
  ConnectorsTypes.database,
  ConnectorsTypes.migration,
  ConnectorsTypes.transport,
  ConnectorsTypes.application,
];

/**
 * Plugin boot priority
 */
export const PluginsPriority = [
  PluginTypes.essential,
  PluginTypes.database,
  PluginTypes.transport,
];

export const PLUGIN_STATUS_OK = 'ok';
export const PLUGIN_STATUS_FAIL = 'fail';
