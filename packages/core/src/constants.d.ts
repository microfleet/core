/**
 * This file exports constants used throughout the project
 * @module mservice:constants
 */
export declare type Primitive = string | number | boolean | undefined | null;
export declare function literal<T extends Primitive>(value: T): T;
/**
 * Returns first arg that is passed to the function
 */
export declare const identity: <T>(arg: T) => T;
/**
 * Connector property.
 */
export declare const CONNECTORS_PROPERTY = "connectors";
/**
 * Destructor property.
 */
export declare const DESTRUCTORS_PROPERTY = "destructors";
/**
 * Health checks property
 */
export declare const HEALTH_CHECKS_PROPERTY = "healthChecks";
/**
 * Constants with possilble transport values
 */
export declare const ActionTransport: {
    amqp: "amqp";
    http: "http";
    internal: "internal";
    socketIO: "socketIO";
};
export declare const DATA_KEY_SELECTOR: {
    amqp: "params";
    delete: "query";
    get: "query";
    head: "query";
    internal: "params";
    patch: "params";
    post: "params";
    put: "params";
    socketio: "params";
};
/**
 * Constants with connect types to control order of service bootstrap
 */
export declare const ConnectorsTypes: {
    application: "application";
    database: "database";
    essential: "essential";
    migration: "migration";
    transport: "transport";
};
/**
 * Plugin Types
 */
export declare const PluginTypes: {
    application: "application";
    database: "database";
    essential: "essential";
    transport: "transport";
};
/**
 * Default priority of connectors during bootstrap
 */
export declare const ConnectorsPriority: ("application" | "database" | "essential" | "migration" | "transport")[];
/**
 * Plugin boot priority
 */
export declare const PluginsPriority: ("application" | "database" | "essential" | "transport")[];
export declare const PLUGIN_STATUS_OK = "ok";
export declare const PLUGIN_STATUS_FAIL = "fail";
