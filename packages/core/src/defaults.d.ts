import { RouterConfig } from './plugins/router/factory';
import { ValidatorConfig } from './plugins/validator';
/**
 * Default configurations module
 * @module mservice:defaults
 */
export declare const validator: Partial<ValidatorConfig>;
/**
 * Settigs for Logger plugin
 */
export declare const logger: {
    /**
     * anything thats not production will include extra logs
     * @type {boolean}
     */
    debug: boolean;
    /**
     * Enables default logger to stdout
     * @type {boolean}
     */
    defaultLogger: boolean;
};
/**
 * Default plugins that each service would likely require
 * It's advised to revamp this per your project
 */
export declare const plugins: string[];
/**
 * Default Router configuration.
 */
export declare const router: Partial<RouterConfig>;
/**
 * Default HTTP Plugin Configuration
 */
export declare const http: {
    server: {
        /**
         * Use Hapi.js as server implementation, other options include express and restify
         * @type {String}
         */
        handler: string;
        /**
         * Do not include socket.io transport
         * @type {Boolean}
         */
        attachSocketIO: boolean;
        /**
         * Listen on port 3000
         * @type {Number}
         */
        port: number;
    };
    router: {
        /**
         * Enables router plugin for HTTP handler
         */
        enabled: boolean;
        /**
         * Will be used as <http.router.prefix>/<router.routes.prefix>/<actionName>
         * If any of the prefixes are empty strings - they are omitted
         */
        prefix: string;
    };
};
/**
 * Contains function definitions for service-specific hooks
 */
export declare const hooks: {};
/**
 * Contains amqp plugin configuration
 */
export declare const amqp: {
    /**
     * @microfleet/transport-amqp configuration
     * @type {Object}
     */
    transport: {};
    /**
     * Router adapter configuration
     */
    router: {
        enabled: boolean;
    };
};
/**
 * Enables graceful handling of shutdown for supported plugins
 */
export declare const sigterm = true;
/**
 * Opentracing configuration
 */
export declare const opentracing: {
    config: {
        disable: boolean;
        serviceName: string;
    };
};
export declare const prometheus: {
    config: {
        port: number;
        path: string;
    };
};
/**
 * Health check retry options
 * https://www.npmjs.com/package/bluebird-retry
 */
export declare const healthChecks: {
    interval: number;
    max_tries: number;
};
