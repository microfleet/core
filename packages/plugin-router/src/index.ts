import * as Extensions from './extensions/index' // @TODO remove import?
import RequestCountTracker from './tracker'
import './lifecycle/handlers/allowed'

export type { LifecycleExtension } from './lifecycle/index'
export { Lifecycle } from './lifecycle/index'
export type { ServiceActionAuthConfig } from './lifecycle/handlers/auth'

export { Extensions, RequestCountTracker }

export * from './plugin'
export type * from './types/plugin'

export { Router, ActionTransport } from './router'
export type {
  ServiceRequest,
  ServiceAction,
  ServiceMiddleware,
  ServiceActionHandler,
  ServiceActionAuthGetName,
  TransportOptions,
  DispatchOptions,
} from './types/router'
export { BaseServiceRequest, InternalServiceRequest } from './service-request'

export type { AuthInfo } from './lifecycle/handlers/auth'

export * from './symbols'
