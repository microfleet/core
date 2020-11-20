import Bluebird from 'bluebird'
import { Microfleet } from '@microfleet/core'

import Router from '../router'
import Lifecycle from '../lifecycle'
import { ServiceRequest } from './router'

export type LifecyclePoints = typeof Lifecycle.points

declare module '@microfleet/core' {
  export interface Microfleet {
    router: Router
    dispatch: dispatchHelper
  }

  export interface ConfigurationOptional {
    router: RouterPluginConfig
  }
}

export interface RouterPlugin {
  router: Router
  dispatch: dispatchHelper
}

export type dispatchHelper = (route: string, request: Partial<ServiceRequest>) => Bluebird<any>

export type RouterPluginConfig = {
  auth: RouterPluginAuthConfig
  extensions: RouterPluginExtensionsConfig
  // @todo move validateResponse under routes?
  routes: RouterPluginRoutesConfig
}

export interface RouterPluginAuthConfig {
  readonly strategies: Record<string, RouterPluginAuthStrategy>
}

// rename to MicrofleetHandler and move out of here
export interface RouterPluginAuthStrategy {
  (this: Microfleet, request: ServiceRequest): PromiseLike<any>
}

export type RouterLifecycleExtension = {
  point: LifecyclePoints[keyof LifecyclePoints]
  handler(...args: any[]): PromiseLike<any>;
}[];

export interface RouterPluginExtensionsConfig {
  register: RouterLifecycleExtension[];
}

export interface RouterPluginRoutesConfig {
  directory?: string
  // @todo string[]
  enabled?: Record<string, string>
  prefix?: string
  responseValidation?: RouterPluginRoutesResponseValidationConfig
  enabledGenericActions?: string[]
}

export interface RouterPluginRoutesResponseValidationConfig {
  enabled: boolean
  maxSample: number
  panic: boolean
}
