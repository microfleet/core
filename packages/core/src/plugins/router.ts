import Bluebird = require('bluebird')
import assert = require('assert')
import rfdc = require('rfdc')
import { NotFoundError, NotSupportedError } from 'common-errors'
import { object as isObject } from 'is'
import { ActionTransport, PluginTypes, identity } from '../constants'
import { Microfleet } from '../'
import { ServiceRequestInterface } from '../types'
import { getRouter, Router, RouterConfig, LifecycleRequestType } from './router/factory'
import { ValidatorPlugin } from './validator'
import { ServiceRequest } from '../utils/service-request';

const { internal } = ActionTransport

/**
 * Plugin Name
 */
export const name = 'router'
export { Router, RouterConfig, LifecycleRequestType }
export interface DispatchOptionsInterface {
  simpleResponse?: boolean
}

/**
 * Defines extension points of
 * the router plugin
 */
export interface RouterPlugin {
  router: Router;
  dispatch: (route: string, request: Partial<ServiceRequestInterface>, options?: DispatchOptionsInterface) => PromiseLike<any>;
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
 * Allows to deep clone object
 */
const deepClone = rfdc()

/**
 * Fills gaps in default service request.
 * @param request - service request.
 * @returns Prepared service request.
 */
const prepareRequest = (request: Partial<ServiceRequestInterface>): ServiceRequestInterface => new ServiceRequest(
  internal,
  internal,
  Object.create(null),
  shallowObjectClone(request.headers),
  request.params != null
    ? deepClone(request.params)
    : Object.create(null),
  Object.create(null)
)

/**
 * Enables router plugin.
 * @param opts - Router configuration object.
 */
export function attach(this: Microfleet & ValidatorPlugin & RouterPlugin, opts: Partial<RouterConfig>): void {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  const config = this.validator.ifError('router', opts) as RouterConfig

  for (const transport of config.routes.transports) {
    if (!this.config.plugins.includes(transport) && transport !== internal) {
      throw new NotSupportedError(`transport ${transport}`)
    }
  }

  const router = this.router = getRouter(config, this)

  const { prefix } = config.routes
  const assemble = prefix
    ? (route: string) => `${prefix}.${route}`
    : identity

  // internal dispatcher
  const dispatch = async (route: string, request: Partial<ServiceRequestInterface>, options?: DispatchOptionsInterface) => {
    const serviceRequest = prepareRequest(request)
    const data = await router.dispatch(assemble(route), serviceRequest)
    const includeHeaders = options && options.simpleResponse === false;

    return includeHeaders
      ? { data, headers: Object.fromEntries(serviceRequest.getReplyHeaders()) }
      : data;
  };

  this.dispatch = Bluebird.method(dispatch)
}
