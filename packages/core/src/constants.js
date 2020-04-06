"use strict";
/**
 * This file exports constants used throughout the project
 * @module mservice:constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
function literal(value) {
    return value;
}
exports.literal = literal;
/**
 * Returns first arg that is passed to the function
 */
exports.identity = (arg) => arg;
/**
 * Connector property.
 */
exports.CONNECTORS_PROPERTY = 'connectors';
/**
 * Destructor property.
 */
exports.DESTRUCTORS_PROPERTY = 'destructors';
/**
 * Health checks property
 */
exports.HEALTH_CHECKS_PROPERTY = 'healthChecks';
/**
 * Constants with possilble transport values
 */
exports.ActionTransport = {
    amqp: literal('amqp'),
    http: literal('http'),
    internal: literal('internal'),
    socketIO: literal('socketIO'),
};
// based on this we validate input data
exports.DATA_KEY_SELECTOR = {
    amqp: literal('params'),
    delete: literal('query'),
    get: literal('query'),
    head: literal('query'),
    internal: literal('params'),
    patch: literal('params'),
    post: literal('params'),
    put: literal('params'),
    socketio: literal('params'),
};
/**
 * Constants with connect types to control order of service bootstrap
 */
exports.ConnectorsTypes = {
    application: literal('application'),
    database: literal('database'),
    essential: literal('essential'),
    migration: literal('migration'),
    transport: literal('transport'),
};
/**
 * Plugin Types
 */
exports.PluginTypes = {
    application: literal('application'),
    database: literal('database'),
    essential: literal('essential'),
    transport: literal('transport'),
};
/**
 * Default priority of connectors during bootstrap
 */
exports.ConnectorsPriority = [
    exports.ConnectorsTypes.essential,
    exports.ConnectorsTypes.database,
    exports.ConnectorsTypes.migration,
    exports.ConnectorsTypes.transport,
    exports.ConnectorsTypes.application,
];
/**
 * Plugin boot priority
 */
exports.PluginsPriority = [
    exports.PluginTypes.essential,
    exports.PluginTypes.database,
    exports.PluginTypes.transport,
    exports.PluginTypes.application,
];
exports.PLUGIN_STATUS_OK = 'ok';
exports.PLUGIN_STATUS_FAIL = 'fail';
//# sourceMappingURL=constants.js.map