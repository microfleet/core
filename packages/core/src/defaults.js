"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const constants = require("./constants");
const factory_1 = require("./plugins/router/factory");
/**
 * This extension defaults schemas to the name of the action
 */
const schemaLessAction_1 = require("./plugins/router/extensions/validate/schemaLessAction");
/**
 * Provides audit log for every performed action
 */
const log_1 = require("./plugins/router/extensions/audit/log");
/**
 * Default configurations module
 * @module mservice:defaults
 */
exports.validator = {
    schemas: [],
    serviceConfigSchemaIds: ['microfleet.core', 'config'],
    filter: null,
    ajv: {
        strictKeywords: true,
    },
};
/**
 * Settigs for Logger plugin
 */
exports.logger = {
    /**
     * anything thats not production will include extra logs
     * @type {boolean}
     */
    debug: process.env.NODE_ENV !== 'production',
    /**
     * Enables default logger to stdout
     * @type {boolean}
     */
    defaultLogger: true,
};
/**
 * Default plugins that each service would likely require
 * It's advised to revamp this per your project
 */
exports.plugins = [
    'validator',
    'logger',
    'router',
    'http',
];
/**
 * Default Router configuration.
 */
exports.router = {
    /**
     * Routes configuration
     */
    routes: {
        /**
         * Directory to scan for actions.
         */
        directory: path.resolve(process.cwd(), 'src/actions'),
        /**
         * When set to empty object, will scan directory
         */
        enabled: Object.create(null),
        /**
         * Prefix for actions, it's added after transport-specific configuration
         */
        prefix: '',
        /**
         * Sets transports defined here as default ones for action.
         */
        setTransportsAsDefault: true,
        /**
         * Initialize that array of transports
         */
        transports: [constants.ActionTransport.http],
        /**
         * Enables health action by default
         */
        enabledGenericActions: [
            'health',
        ],
    },
    /**
     * Extensions configuration
     */
    extensions: {
        /**
         * Enabled extension points
         */
        enabled: [factory_1.LifecyclePoints.postRequest, factory_1.LifecyclePoints.preRequest, factory_1.LifecyclePoints.preResponse],
        /**
         * Enabled plugins
         */
        register: [schemaLessAction_1.default, log_1.default()],
    },
};
/**
 * Default HTTP Plugin Configuration
 */
exports.http = {
    server: {
        /**
         * Use Hapi.js as server implementation, other options include express and restify
         * @type {String}
         */
        handler: 'hapi',
        /**
         * Do not include socket.io transport
         * @type {Boolean}
         */
        attachSocketIO: false,
        /**
         * Listen on port 3000
         * @type {Number}
         */
        port: 3000,
    },
    router: {
        /**
         * Enables router plugin for HTTP handler
         */
        enabled: true,
        /**
         * Will be used as <http.router.prefix>/<router.routes.prefix>/<actionName>
         * If any of the prefixes are empty strings - they are omitted
         */
        prefix: '',
    },
};
/**
 * Contains function definitions for service-specific hooks
 */
exports.hooks = {};
/**
 * Contains amqp plugin configuration
 */
exports.amqp = {
    /**
     * @microfleet/transport-amqp configuration
     * @type {Object}
     */
    transport: {},
    /**
     * Router adapter configuration
     */
    router: {
        enabled: false,
    },
};
/**
 * Enables graceful handling of shutdown for supported plugins
 */
exports.sigterm = true;
/**
 * Opentracing configuration
 */
exports.opentracing = {
    config: {
        disable: true,
        serviceName: 'microfleet',
    },
};
exports.prometheus = {
    config: {
        port: 9102,
        path: '/metrics',
    },
};
/**
 * Health check retry options
 * https://www.npmjs.com/package/bluebird-retry
 */
exports.healthChecks = {
    interval: 500,
    max_tries: 3,
};
//# sourceMappingURL=defaults.js.map