import { Microfleet } from '../..';
import { ServiceAction, ServiceActionStep } from '../../types';
import dispatch from './dispatcher';
import Extensions, { ExtensionsConfig, LifecycleRequestType, LifecyclePoints } from './extensions';
import { AuthOptions } from './modules/auth';
import { RoutesConfig } from './routes';
import { RequestCountTracker } from './request-tracker';
export { LifecycleRequestType, LifecyclePoints };
export interface RouteMap {
    [transport: string]: {
        [routingKey: string]: ServiceAction;
    };
}
export interface RouterConfig {
    auth: AuthOptions;
    extensions: ExtensionsConfig;
    routes: RoutesConfig;
}
/**
 * Defines router signature
 */
export interface Router {
    config: RouterConfig;
    service: Microfleet;
    dispatch: typeof dispatch;
    extensions: Extensions;
    routes: RouteMap;
    requestCountTracker: RequestCountTracker;
    modules: {
        request: ServiceActionStep;
        auth: ServiceActionStep;
        validate: ServiceActionStep;
        allowed: ServiceActionStep;
        handler: ServiceActionStep;
        response: ServiceActionStep;
    };
}
/**
 * Initializes router.
 * @param config - Router configuration object.
 * @param config.auth - Auth module configuration object.
 * @param config.extensions - Extensions configuration object.
 * @param config.routes - Routes configuration object.
 * @param service - Microfleet instance.
 * @returns Router instance.
 */
export declare function getRouter(config: RouterConfig, service: Microfleet): Router;
