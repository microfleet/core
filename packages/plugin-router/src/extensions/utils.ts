import { ServiceRequest } from '@microfleet/core'

import Lifecycle from '../lifecycle'
import { RouterLifecycleExtension } from '../types/plugin'

interface RequestStartExtension {
  started: [number, number];
  executionTotal: [number, number];
}

export type ServiceRequestWithStart = ServiceRequest & RequestStartExtension

export function getInitTimingExtension(): RouterLifecycleExtension[0] {
  return {
    point: Lifecycle.points.preRequest,
    async handler(request: ServiceRequestWithStart): Promise<void> {
      request.started = request.started || process.hrtime()
    },
  }
}
