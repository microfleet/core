import { strict as assert } from 'assert'
import { resolve } from 'path'
import rfdc = require('rfdc')
import { isObject } from 'lodash'
import { Microfleet, PluginTypes } from '@microfleet/core'
import { defaultsDeep } from '@microfleet/utils'

import { RouterPluginConfig } from './types/plugin'
import { ServiceRequest } from './types/router'
import Router from './router'
import { auditLog } from './extensions'

export const name = 'router'
export const type = PluginTypes.transport
export const priority = 100

/**
 * Shallow copies object, pass-through everything else
 */
const shallowObjectClone = (prop: any) => isObject(prop)
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
  method: Router.ActionTransport.internal,
  params: request.params != null
    ? deepClone(request.params)
    : Object.create(null),
  parentSpan: undefined,
  query: Object.create(null),
  route: '',
  span: undefined,
  transport: Router.ActionTransport.internal,
  transportRequest: Object.create(null),
})

const defaultConfig: Partial<RouterPluginConfig> = {
 /* Routes configuration */
 routes: {
   /* Directory to scan for actions. */
   directory: resolve(process.cwd(), 'src/actions'),

   /* Enables health action by default */
   enabledGenericActions: [
     'health',
   ],

   /* Enables response validation. */
   responseValidation: {
     enabled: false,
     maxSample: 7,
     panic: false,
   }
 },

 /* Extensions configuration */
 extensions: {
   register: [auditLog()],
 },
}

export function attach(
  this: Microfleet,
  options: Partial<RouterPluginConfig>
): void {
  assert(this.hasPlugin('logger'), 'log module must be included')
  assert(this.hasPlugin('validator'), 'validator module must be included')

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config: RouterPluginConfig = this.validator.ifError('router', defaultsDeep(options, defaultConfig))
  const router = this.router = new Router(config, this)

  // dispatcher
  this.dispatch = (route: string, request: Partial<ServiceRequest>) => {
    const msg = prepareRequest(request)

    return router.prefixAndDispatch(route, msg)
  }
}
