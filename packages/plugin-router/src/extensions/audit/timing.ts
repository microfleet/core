import Lifecycle, { LifecycleExtension } from '../../lifecycle'
import type { ServiceRequest } from '../../types/router'

declare module '../../types/router' {
  interface ServiceRequest {
    requestStarted?: [number, number];
    requestEnded?: [number, number];
  }
}

export function getInitTimingExtension(): LifecycleExtension {
  return {
    point: Lifecycle.hooks.preRequest,
    async handler(request: ServiceRequest): Promise<void> {
      request.requestStarted = process.hrtime()
    },
  }
}
