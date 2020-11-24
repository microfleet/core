import CoreLifecycle, { CoreLifecycleOptionsExtension } from '../lifecycle/core'
import { ServiceRequest } from '../types/router'

// @todo properties not optional
export interface ServiceRequestWithStart extends ServiceRequest {
  started?: [number, number];
  executionTotal?: [number, number];
}

export function getInitTimingExtension(): CoreLifecycleOptionsExtension[0] {
  return {
    point: CoreLifecycle.points.preRequest,
    async handler(request: ServiceRequestWithStart): Promise<void> {
      request.started = request.started || process.hrtime()
    },
  }
}
