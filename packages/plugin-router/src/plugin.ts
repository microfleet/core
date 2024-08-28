import assert from 'node:assert/strict'
import { resolve } from 'path'
import rfdc from 'rfdc'
import { isObject } from 'lodash'
import { Microfleet, PluginTypes } from '@microfleet/core'
import { defaultsDeep } from '@microfleet/utils'

import { Router, defaultDispatchOptions } from './router'
import Routes from './routes'
import Tracker from './tracker'
import { auditLog } from './extensions/index'
import { Lifecycle } from './lifecycle/index'
import { InternalServiceRequest } from './service-request'

import type { RouterPluginConfig } from './types/plugin'
import type { ServiceRequest, DispatchOptions } from './types/router'
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

export function createInternalRequest(request: Partial<ServiceRequest>): ServiceRequest {
  const { params, headers, locals } = request
  return new (InternalServiceRequest as any)(
    params != null
      ? deepClone(params)
      : Object.create(null),
    shallowObjectClone(headers),
    request,
    shallowObjectClone(locals),
  )
}

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
  dispatchOptions: defaultDispatchOptions,
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
      responseValidation: validateResponse,
    },
    dispatchOptions
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
      dispatchOptions,
    },
    log: this.log,
    requestCountTracker: new Tracker(this),
  })

  // dispatcher
  this.dispatch = (route: string, request: Partial<ServiceRequest>, dispatchOptions?: Partial<DispatchOptions>) =>
    router.prefixAndDispatch(route, createInternalRequest(request), dispatchOptions)

  return {
    async connect() {
      await router.ready()
    }
  }
}
