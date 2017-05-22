// @flow

/**
 * This file exports constants used throughout the project
 * @module mservice:constants
 */

exports.CONNECTORS_PROPERTY = '_connectors';
exports.DESTRUCTORS_PROPERTY = '_destructors';

/**
 * Constants with possilble transport values
 * @type {Object}
 */
exports.ActionTransport = {
  amqp: 'amqp',
  http: 'http',
  socketIO: 'socketIO',
};

/**
 * Constants with connect types to control order of service bootstrap
 * @type {Object}
 */
const ConnectorsTypes = exports.ConnectorsTypes = {
  essential: 'essential',
  database: 'database',
  migration: 'migration',
  transport: 'transport',
  application: 'application',
};

/**
 * Plugin Types
 * @type {Object}
 */
const PluginsTypes = exports.PluginsTypes = {
  essential: 'essential',
  database: 'database',
  transport: 'transport',
};

/**
 * Default priority of connectors during bootstrap
 * @type {Array}
 */
exports.ConnectorsPriority = [
  ConnectorsTypes.essential,
  ConnectorsTypes.database,
  ConnectorsTypes.migration,
  ConnectorsTypes.transport,
  ConnectorsTypes.application,
];

/**
 * Plugin boot priority
 * @type {Array}
 */
exports.PluginsPriority = [
  PluginsTypes.essential,
  PluginsTypes.database,
  PluginsTypes.transport,
];
