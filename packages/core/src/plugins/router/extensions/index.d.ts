import Bluebird = require('bluebird');
import { $Values } from '../../../types';
export declare const LifecyclePoints: {
    preAllowed: "preAllowed";
    postAllowed: "postAllowed";
    preAuth: "preAuth";
    postAuth: "postAuth";
    preHandler: "preHandler";
    postHandler: "postHandler";
    preRequest: "preRequest";
    postRequest: "postRequest";
    preResponse: "preResponse";
    postResponse: "postResponse";
    preValidate: "preValidate";
    postValidate: "postValidate";
};
export declare type LifecycleRequestType = $Values<typeof LifecyclePoints>;
/**
 * Type definitions
 */
export interface ExtensionPlugin {
    point: LifecycleRequestType;
    handler(...args: any[]): PromiseLike<any>;
}
export interface ExtensionsConfig {
    enabled: LifecycleRequestType[];
    register: ExtensionPlugin[][];
}
/**
 * @class Extensions
 * @param config - Extensions configuration object.
 * @param config.enabled - Enabled lifecycle events.
 * @param config.register - Extensions to register.
 */
declare class Extensions {
    extensions: {
        [extensionName: string]: ExtensionPlugin['handler'][];
    };
    constructor(config?: ExtensionsConfig);
    autoRegister(register: ExtensionPlugin[][]): void;
    /**
     * Checks for existence of the extension handler name.
     * @param name - Name of the extension handler.
     * @returns True if exists.
     */
    has(name: LifecycleRequestType): boolean;
    /**
     * Registeres handler of the lifecycle event.
     * @param {string} name - Name of the lifecycle event.
     * @param {Function} handler - Handler of the event.
     */
    register(name: LifecycleRequestType, handler: (...args: any[]) => PromiseLike<any | never>): void;
    /**
     * Executes handlers for the lifecycle event.
     * @param name - Name of the lifecycle event.
     * @param args - Arguments to pass to lifecycle handlers.
     * @param [context=null] - Context to call lifecycle handlers with.
     * @returns Result of the invocation.
     */
    exec(name: string, args?: any[], context?: any): Bluebird<any>;
}
export default Extensions;
