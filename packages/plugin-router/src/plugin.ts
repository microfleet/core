import assert from 'node:assert/strict'
import { resolve } from 'path'
import rfdc from 'rfdc'
import { isObject } from 'lodash'
import { Microfleet, PluginTypes } from '@microfleet/core'
import { defaultsDeep } from '@microfleet/utils'

import { Router, ActionTransport } from './router'
import Routes from './routes'
import Tracker from './tracker'
import { auditLog } from './extensions/index'
import { Lifecycle } from './lifecycle/index'

import type { RouterPluginConfig } from './types/plugin'
import type { ServiceRequest } from './types/router'
import type { PluginInterface } from '@microfleet/core-types'

export const name = 'router'
export const type = PluginTypes.transport
export const priority = 10

/**
 * Shallow copies object, pass-through everything else
 */
const shallowObjectClone = (prop: any) => isObject(prop)
  ? { ...prop }
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
const prepareInternalRequest = (request: Partial<ServiceRequest>): ServiceRequest => ({
  // initiate action to ensure that we have prepared proto fo the object
  // input params
  // make sure we standardize the request
  // to provide similar interfaces
  action: null as any,
  headers: shallowObjectClone(request.headers),
  locals: shallowObjectClone(request.locals),
  auth: shallowObjectClone(request.auth),
  log: console as any,
  method: ActionTransport.internal,
  params: request.params != null
    ? deepClone(request.params)
    : Object.create(null),
  parentSpan: null,
  span: null,
  query: Object.create(null),
  route: '',
  transport: ActionTransport.internal,
  transportRequest: Object.create(null),
  reformatError: false,
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

export async function attach(
  this: Microfleet,
  options: Partial<RouterPluginConfig>
): Promise<PluginInterface> {
  assert(this.hasPlugin('logger'), 'log module must be included')
  assert(this.hasPlugin('validator'), 'validator module must be included')

  // load local schemas
  await this.validator.addLocation(resolve(__dirname, '../schemas'))

  const {
    auth,
    extensions: { register: extensions },
    routes: {
      prefix,
      directory,
      enabled,
      allRoutes,
      enabledGenericActions,
      responseValidation: validateResponse
    }
  } = this.validator.ifError<RouterPluginConfig>('router', defaultsDeep(options, defaultConfig))

  const routes = new Routes()
  const lifecycle = new Lifecycle({
    extensions,
    config: { auth, validateResponse },
    context: this,
  })
  const router = this.router = new Router({
    routes,
    lifecycle,
    config: {
      prefix,
      directory,
      enabled,
      enabledGenericActions,
      allRoutes,
    },
    log: this.log,
    requestCountTracker: new Tracker(this)
  })

  // dispatcher
  this.dispatch = (route: string, request: Partial<ServiceRequest>) =>
    router.prefixAndDispatch(route, prepareInternalRequest(request))

  return {
    async connect() {
      await router.ready()
    }
  }
}
