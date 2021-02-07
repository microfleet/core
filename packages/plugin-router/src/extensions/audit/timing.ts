import Lifecycle from '../../lifecycle/abstract'
import { LifecycleExtension } from '../'
import { ServiceRequest } from '../../types/router'

// @todo properties not optional
export interface ServiceRequestWithStart extends ServiceRequest {
  started?: [number, number];
  executionTotal?: [number, number];
}

export function getInitTimingExtension(): LifecycleExtension {
  return {
    point: Lifecycle.points.preRequest,
    async handler(request: ServiceRequestWithStart): Promise<void> {
      request.started = request.started || process.hrtime()
    },
  }
}
