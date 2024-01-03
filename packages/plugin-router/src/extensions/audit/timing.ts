import { Lifecycle, LifecycleExtension } from '../../lifecycle/index'
import type { ServiceRequest } from '../../types/router'

declare module '../../types/router' {
  interface ServiceRequest {
    requestStarted?: [number, number];
    requestEnded?: [number, number];
  }
}

export const initTimingExtension: LifecycleExtension = {
  point: Lifecycle.hooks.preRequest,
  async handler(request: ServiceRequest): Promise<void> {
    request.requestStarted = process.hrtime()
  },
}
