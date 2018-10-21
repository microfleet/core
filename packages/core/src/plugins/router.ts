import assert = require('assert')
import { NotFoundError, NotSupportedError } from 'common-errors'
import { ActionTransport, PluginTypes } from '../constants'
import { Microfleet } from '../'
import { ServiceRequest } from '../types'
import { getRouter, Router, RouterConfig, LifecycleRequestType } from './router/factory'
import { ValidatorPlugin } from './validator'
import { LoggerPlugin } from './logger'

const identity = <T>(arg: T) => arg
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
  dispatch: Router['dispatch']
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
 * Fills gaps in default service request.
 * @param request - service request.
 * @returns Prepared service request.
 */
const prepareRequest = (request: ServiceRequest): ServiceRequest => ({
  // initiate action to ensure that we have prepared proto fo the object
  // input params
  // make sure we standardize the request
  // to provide similar interfaces
  action: null as any,
  headers: { ...request.headers },
  locals: { ...request.locals },
  log: console as any,
  method: internal as ServiceRequest['method'],
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
  service.dispatch = (route: string, request: ServiceRequest) => {
    const msg = prepareRequest(request)
    return router.dispatch(assemble(route), msg)
  }
}
