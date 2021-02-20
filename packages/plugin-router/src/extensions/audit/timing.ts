import Lifecycle, { LifecycleExtension } from '../../lifecycle'
import { ServiceRequest } from '../../types/router'

// @todo properties not optional
export interface ServiceRequestWithStart extends ServiceRequest {
  started?: [number, number];
  executionTotal?: [number, number];
}

export function getInitTimingExtension(): LifecycleExtension {
  return {
    point: Lifecycle.hooks.preRequest,
    async handler(request: ServiceRequestWithStart): Promise<void> {
      request.started = request.started || process.hrtime()
    },
  }
}
