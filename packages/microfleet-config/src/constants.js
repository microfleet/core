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
const ConnectorTypes = exports.ConnectorsTypes = exports.ConnectorTypes = {
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
const PluginTypes = exports.PluginsTypes = exports.PluginTypes = {
  essential: 'essential',
  database: 'database',
  transport: 'transport',
};

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
