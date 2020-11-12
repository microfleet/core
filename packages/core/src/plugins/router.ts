import assert = require('assert')
import rfdc = require('rfdc')
import path = require('path')
import { NotFoundError } from 'common-errors'
import { ActionTransport, PluginTypes, identity, defaultsDeep } from '@microfleet/utils'
import type { Microfleet, ServiceRequest } from '@microfleet/core-types'
import { getRouter, Router, RouterConfig, LifecycleRequestType } from './router/factory'
import { LifecyclePoints } from './router/extensions'
import { object as isObject } from 'is'
const { internal } = ActionTransport
import autoSchema from './router/extensions/validate/schemaLessAction'
import auditLog from './router/extensions/audit/log'

/* ensure its just types */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type * as _ from '@microfleet/plugin-validator'

/**
 * Default Router configuration.
 */
export const defaultConfig: Partial<RouterConfig> = {
  /**
   * Routes configuration
   */
  routes: {
    /**
     * Directory to scan for actions.
     */
    directory: path.resolve(process.cwd(), 'src/actions'),

    /**
     * When set to empty object, will scan directory
     */
    enabled: Object.create(null),

    /**
     * Prefix for actions, it's added after transport-specific configuration
     */
    prefix: '',

    /**
     * Sets transports defined here as default ones for action.
     */
    setTransportsAsDefault: true,

    /**
     * Initialize that array of transports
     */
    transports: [ActionTransport.http],

    /**
     * Enables health action by default
     */
    enabledGenericActions: [
      'health',
    ],

    /**
     * Enables response validation.
     */
    responseValidation: {
      enabled: false,
      maxSample: 7,
      panic: false,
    }
  },

  /**
   * Extensions configuration
   */
  extensions: {
    /**
     * Enabled extension points
     */
    enabled: [LifecyclePoints.postRequest, LifecyclePoints.preRequest, LifecyclePoints.preResponse],

    /**
     * Enabled plugins
     */
    register: [autoSchema, auditLog()],
  },
}

/**
 * Plugin Name
 */
export const name = 'router'

/**
 * Export helpers
 */
export { LifecycleRequestType }

declare module '@microfleet/core-types' {
  interface Microfleet {
    router: Router
  }

  interface ConfigurationOptional {
    router: RouterConfig
  }
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
const prepareRequest = (request: Partial<ServiceRequest>): ServiceRequest => ({
  // initiate action to ensure that we have prepared proto fo the object
  // input params
  // make sure we standardize the request
  // to provide similar interfaces
  action: null as any,
  headers: shallowObjectClone(request.headers),
  locals: shallowObjectClone(request.locals),
  auth: shallowObjectClone(request.auth),
  log: console as any,
  method: internal as ServiceRequest['method'],
  params: request.params != null
    ? deepClone(request.params)
    : Object.create(null),
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
export function attach(this: Microfleet, opts: Partial<RouterConfig>): void {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // validate & overwrite
  const config = this.config.router = this.validator.ifError<RouterConfig>('router', defaultsDeep(opts, defaultConfig))

  // @todo fix it
  // for (const transport of config.routes.transports) {
  //   if (!this.config.plugins.includes(transport) && transport !== internal) {
  //     throw new NotSupportedError(`transport ${transport}`)
  //   }
  // }

  const router = this.router = getRouter(config, this)

  const { prefix } = config.routes
  const assemble = prefix
    ? (route: string) => `${prefix}.${route}`
    : identity

  // dispatcher
  this.dispatch = (route: string, request: Partial<ServiceRequest>) => {
    const msg = prepareRequest(request)
    return router.dispatch(assemble(route), msg)
  }
}
