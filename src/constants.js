// @flow

/**
 * This file exports constants used throughout the project
 * @module mservice:constants
 */

/**
 * Connector property.
 * @type {string}
 */
exports.CONNECTORS_PROPERTY = '_connectors';

/**
 * Destructor property.
 * @type {string}
 */
exports.DESTRUCTORS_PROPERTY = '_destructors';

/**
 * Health checks property
 * @type {string}
 */
exports.HEALTH_CHECKS_PROPERTY = '_healthChecks';

/**
 * Constants with possilble transport values
 * @type {Object}
 */
exports.ActionTransport = Object.setPrototypeOf({
  amqp: 'amqp',
  http: 'http',
  socketIO: 'socketIO',
  internal: 'internal',
}, null);

// based on this we validate input data
exports.DATA_KEY_SELECTOR = Object.setPrototypeOf(({
  get: 'query',
  delete: 'query',
  head: 'query',
  patch: 'params',
  put: 'params',
  post: 'params',
  amqp: 'params',
  socketio: 'params',
  internal: 'params',
}: ValidationObjectSelector), null);

/**
 * Constants with connect types to control order of service bootstrap
 * @type {Object}
 */
const ConnectorTypes = exports.ConnectorsTypes = exports.ConnectorTypes = Object.setPrototypeOf({
  essential: 'essential',
  database: 'database',
  migration: 'migration',
  transport: 'transport',
  application: 'application',
}, null);

/**
 * Plugin Types
 * @type {Object}
 */
const PluginTypes = exports.PluginsTypes = exports.PluginTypes = Object.setPrototypeOf({
  essential: 'essential',
  database: 'database',
  transport: 'transport',
}, null);

/**
 * Default priority of connectors during bootstrap
 * @type {Array}
 */
exports.ConnectorsPriority = [
  ConnectorTypes.essential,
  ConnectorTypes.database,
  ConnectorTypes.migration,
  ConnectorTypes.transport,
  ConnectorTypes.application,
];

/**
 * Plugin boot priority
 * @type {Array}
 */
exports.PluginsPriority = [
  PluginTypes.essential,
  PluginTypes.database,
  PluginTypes.transport,
];

exports.PLUGIN_STATUS_OK = 'ok';
exports.PLUGIN_STATUS_FAIL = 'fail';
