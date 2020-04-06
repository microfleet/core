"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const Errors = require("common-errors");
const is = require("is");
const constants_1 = require("../../../constants");
exports.LifecyclePoints = {
    preAllowed: constants_1.literal('preAllowed'),
    postAllowed: constants_1.literal('postAllowed'),
    preAuth: constants_1.literal('preAuth'),
    postAuth: constants_1.literal('postAuth'),
    preHandler: constants_1.literal('preHandler'),
    postHandler: constants_1.literal('postHandler'),
    preRequest: constants_1.literal('preRequest'),
    postRequest: constants_1.literal('postRequest'),
    preResponse: constants_1.literal('preResponse'),
    postResponse: constants_1.literal('postResponse'),
    preValidate: constants_1.literal('preValidate'),
    postValidate: constants_1.literal('postValidate'),
};
const toArray = (arg) => Array.isArray(arg) ? arg : [arg];
function walkOverHandlers(previousArgs, handler) {
    return handler.apply(this, toArray(previousArgs));
}
/**
 * @class Extensions
 * @param config - Extensions configuration object.
 * @param config.enabled - Enabled lifecycle events.
 * @param config.register - Extensions to register.
 */
class Extensions {
    constructor(config = { enabled: [], register: [] }) {
        const { enabled, register } = config;
        const extensions = Object.create(null);
        for (const extension of enabled) {
            extensions[extension] = [];
        }
        this.extensions = extensions;
        this.autoRegister(register);
    }
    autoRegister(register) {
        for (const extensions of register) {
            for (const extension of extensions) {
                this.register(extension.point, extension.handler);
            }
        }
    }
    /**
     * Checks for existence of the extension handler name.
     * @param name - Name of the extension handler.
     * @returns True if exists.
     */
    has(name) {
        const handlers = this.extensions[name];
        return handlers !== undefined && handlers.length > 0;
    }
    /**
     * Registeres handler of the lifecycle event.
     * @param {string} name - Name of the lifecycle event.
     * @param {Function} handler - Handler of the event.
     */
    register(name, handler) {
        if (this.extensions[name] === undefined) {
            throw new Errors.NotSupportedError(name);
        }
        this.extensions[name].push(handler);
    }
    /**
     * Executes handlers for the lifecycle event.
     * @param name - Name of the lifecycle event.
     * @param args - Arguments to pass to lifecycle handlers.
     * @param [context=null] - Context to call lifecycle handlers with.
     * @returns Result of the invocation.
     */
    exec(name, args = [], context = null) {
        const handlers = this.extensions[name];
        if (is.undefined(handlers)) {
            return Bluebird.reject(new Errors.NotSupportedError(name));
        }
        if (!Array.isArray(args)) {
            return Bluebird.reject(new Errors.ArgumentError('"args" must be array'));
        }
        return Bluebird
            .resolve(handlers)
            .bind(context)
            .reduce(walkOverHandlers, args)
            .then(toArray);
    }
}
exports.default = Extensions;
//# sourceMappingURL=index.js.map