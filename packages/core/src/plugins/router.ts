import assert = require('assert')
import { NotFoundError, NotSupportedError } from 'common-errors'
import { ActionTransport, PluginTypes, identity } from '../constants'
import { Microfleet } from '../'
import { ServiceRequestInterface } from '../types'
import { getRouter, Router, RouterConfig, LifecycleRequestType } from './router/factory'
import { ValidatorPlugin } from './validator'
import { LoggerPlugin } from './logger'
import { object as isObject } from 'is'
const { internal } = ActionTransport

/**
 * Plugin Name
 */
export const name = 'router'
export { Router, RouterConfig, LifecycleRequestType }

/**
 * Defines extension points of
 * the router plugin
 */
export interface RouterPlugin {
  router: Router
  dispatch: (route: string, request: Partial<ServiceRequestInterface>) => PromiseLike<any>
}

/**
 * Plugin Type
 */
export const type = PluginTypes.essential

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 100

/**
 * Shallow copies object, pass-through everything else
 */
const shallowObjectClone = (prop: any) =>
  isObject(prop)
    ? Object.assign(Object.create(null), prop)
    : prop

/**
 * Fills gaps in default service request.
 * @param request - service request.
 * @returns Prepared service request.
 */
const prepareRequest = (request: Partial<ServiceRequestInterface>): ServiceRequestInterface => ({
  // initiate action to ensure that we have prepared proto fo the object
  // input params
  // make sure we standardize the request
  // to provide similar interfaces
  action: null as any,
  headers: shallowObjectClone(request.headers),
  locals: shallowObjectClone(request.locals),
  auth: shallowObjectClone(request.auth),
  log: console as any,
  method: internal as ServiceRequestInterface['method'],
  params: { ...request.params },
  parentSpan: undefined,
  query: Object.create(null),
  route: '',
  span: undefined,
  transport: internal,
  transportRequest: Object.create(null),
})

/**
 * Enables router plugin.
 * @param opts - Router configuration object.
 */
export function attach(this: Microfleet & ValidatorPlugin & LoggerPlugin & RouterPlugin, opts: Partial<RouterConfig>) {
  const service = this

  assert(service.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(service.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  const config = service.ifError('router', opts) as RouterConfig

  for (const transport of config.routes.transports) {
    if (!service.config.plugins.includes(transport) && transport !== internal) {
      throw new NotSupportedError(`transport ${transport}`)
    }
  }

  const router = service.router = getRouter(config, service)

  const { prefix } = config.routes
  const assemble = prefix
    ? (route: string) => `${prefix}.${route}`
    : identity

  // dispatcher
  service.dispatch = (route: string, request: Partial<ServiceRequestInterface>) => {
    const msg = prepareRequest(request)
    return router.dispatch(assemble(route), msg)
  }
}
