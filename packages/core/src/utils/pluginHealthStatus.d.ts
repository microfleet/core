import { PluginStatus } from '../types';
import { Microfleet } from '../';
export interface HealthStatus {
    alive: PluginHealthStatus[];
    failed: PluginHealthStatus[];
    status: PluginStatus;
}
export declare class PluginHealthStatus {
    name: string;
    status: PluginStatus;
    error?: Error;
    constructor(name: string, alive?: boolean, error?: Error);
}
export declare class PluginHealthCheck {
    name: string;
    handler: () => any;
    constructor(name: string, handler: () => PromiseLike<any>);
}
/**
 * Walks thru attached status getters and returns a summary system state.
 * @param {Array<PluginHealthCheck>} handlers - Array of plugin health checkers.
 * @param {Object} _opts - Retry options.
 * @returns {Promise<{status: string, alive: Array, failed: Array}>} A current service state.
 */
export declare function getHealthStatus(this: Microfleet, handlers: PluginHealthCheck[], config: any): Promise<HealthStatus>;
