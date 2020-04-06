import { Microfleet } from '../';
import { ServiceRequest } from '../types';
import { Router, RouterConfig, LifecycleRequestType } from './router/factory';
import { ValidatorPlugin } from './validator';
/**
 * Plugin Name
 */
export declare const name = "router";
export { Router, RouterConfig, LifecycleRequestType };
/**
 * Defines extension points of
 * the router plugin
 */
export interface RouterPlugin {
    router: Router;
    dispatch: (route: string, request: Partial<ServiceRequest>) => PromiseLike<any>;
}
/**
 * Plugin Type
 */
export declare const type: "essential";
/**
 * Relative priority inside the same plugin group type
 */
export declare const priority = 100;
/**
 * Enables router plugin.
 * @param opts - Router configuration object.
 */
export declare function attach(this: Microfleet & ValidatorPlugin & RouterPlugin, opts: Partial<RouterConfig>): void;
