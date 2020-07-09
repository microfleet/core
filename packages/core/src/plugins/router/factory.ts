import { Microfleet } from '../..'
import { ServiceAction, ServiceActionStep } from '../../types'
import dispatch from './dispatcher'
import Extensions, { ExtensionsConfig, LifecycleRequestType, LifecyclePoints } from './extensions'
import allowedModule from './modules/allowed'
import getAuthModule, { AuthOptions } from './modules/auth'
import handlerModule from './modules/handler'
import requestModule from './modules/request'
import getResponseHandler from './modules/response'
import validateModule from './modules/validate'
import responseValidate from './modules/response-validate'

import { getRoutes, RoutesConfig } from './routes'
import { RequestCountTracker } from './request-tracker'

export { LifecycleRequestType, LifecyclePoints }

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
    responseValidate: ServiceActionStep;
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
export function getRouter(config: RouterConfig, service: Microfleet): Router {
  const router: Router = {
    config,
    service,
    dispatch,
    requestCountTracker: new RequestCountTracker(service),
    extensions: new Extensions(config.extensions),
    modules: {
      responseValidate,
      allowed: allowedModule,
      auth: getAuthModule(config.auth),
      handler: handlerModule,
      request: requestModule,
      response: getResponseHandler,
      validate: validateModule,
    },
    routes: getRoutes.call(service, config.routes),
  }

  return router
}
