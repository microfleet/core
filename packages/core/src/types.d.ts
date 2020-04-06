/// <reference types="node" />
import { ActionTransport, CONNECTORS_PROPERTY, ConnectorsTypes, DATA_KEY_SELECTOR, DESTRUCTORS_PROPERTY, PLUGIN_STATUS_FAIL, PLUGIN_STATUS_OK, PluginTypes } from './constants';
import { ClientRequest } from 'http';
/**
 * Expose Router Type
 */
export { Router } from './plugins/router';
/**
 * $Keys
 * @desc get the union type of all the keys in an object type `T`
 * @see https://flow.org/en/docs/types/utilities/#toc-keys
 */
export declare type $Keys<T extends object> = keyof T;
/**
 * $Values
 * @desc get the union type of all the values in an object type `T`
 * @see https://flow.org/en/docs/types/utilities/#toc-values
 */
export declare type $Values<T extends object> = T[keyof T];
/**
 * Generic PlguinConnect Interface
 */
export declare type PluginConnector = () => PromiseLike<any>;
/**
 * Plugin Interface
 */
export declare interface PluginInterface {
    connect: PluginConnector;
    close: PluginConnector;
    status?: PluginConnector;
    getRequestCount?: PluginConnector;
}
export declare interface Plugin<T = {}> {
    name: string;
    priority: number;
    type: $Values<typeof PluginTypes>;
    attach(conf: T, parentFile: string): PluginInterface | never;
}
export declare type MserviceError = Error & {
    statusCode: number;
    toJSON(): any;
};
export declare interface AuthConfig {
    name: string;
    passAuthError: boolean;
    strategy: string;
}
export declare type HandlerProperties = typeof CONNECTORS_PROPERTY | typeof DESTRUCTORS_PROPERTY;
export declare type TransportTypes = $Values<typeof ActionTransport>;
export declare type TConnectorsTypes = $Values<typeof ConnectorsTypes>;
export declare type RequestMethods = $Keys<typeof DATA_KEY_SELECTOR>;
export declare type GetAuthName = (req: ServiceRequest) => string;
export declare type ServiceActionStep = (...args: any[]) => PromiseLike<any>;
export declare interface ServiceAction extends ServiceActionStep {
    allowed?: () => boolean | Promise<boolean>;
    auth?: string | GetAuthName | AuthConfig;
    passAuthError?: boolean;
    schema?: string;
    transports: TransportTypes[];
    actionName: string;
    readonly?: boolean;
}
export declare interface ServiceRequest {
    route: string;
    params: any;
    headers: any;
    query: any;
    method: RequestMethods;
    transport: TransportTypes;
    transportRequest: any | ClientRequest;
    action: ServiceAction;
    locals: any;
    auth?: any;
    socket?: NodeJS.EventEmitter;
    parentSpan: any;
    span: any;
    log: {
        trace(...args: any[]): void;
        debug(...args: any[]): void;
        info(...args: any[]): void;
        warn(...args: any[]): void;
        error(...args: any[]): void;
        fatal(...args: any[]): void;
    };
}
export declare type PluginStatus = typeof PLUGIN_STATUS_OK | typeof PLUGIN_STATUS_FAIL;
