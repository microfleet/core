import { Microfleet } from '../..'
import { ServiceAction, ServiceActionStep } from '../../types'
import dispatch from './dispatcher'
import Extensions from './extensions'
import allowedModule from './modules/allowed'
import getAuthModule from './modules/auth'
import handlerModule from './modules/handler'
import requestModule from './modules/request'
import getResponseHandler from './modules/response'
import validateModule from './modules/validate'
import getRoutes from './routes'

export interface RouteMap {
  [transport: string]: {
    [routingKey: string]: ServiceAction
  }
}

/**
 * Defines router signature
 */
export interface MicrofleetRouter {
  config: any
  service: Microfleet
  dispatch: typeof dispatch
  extensions: Extensions
  routes: RouteMap
  modules: {
    request: ServiceActionStep,
    auth: ServiceActionStep,
    validate: ServiceActionStep,
    allowed: ServiceActionStep,
    handler: ServiceActionStep,
    response: ServiceActionStep
  }
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
export function getRouter(config: any, service: Microfleet): MicrofleetRouter {
  const router: MicrofleetRouter = {
    config,
    service,
    dispatch,
    extensions: new Extensions(config.extensions),
    modules: {
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

export default getRouter
