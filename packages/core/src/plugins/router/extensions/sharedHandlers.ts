
import { LifecyclePoints, ExtensionPlugin } from '.'
import type { ServiceRequest } from '@microfleet/core-types'

interface RequestStartExtension {
  started: [number, number];
  executionTotal: [number, number];
}
export type ServiceRequestWithStart = ServiceRequest & RequestStartExtension

export function storeRequestTimeFactory(): ExtensionPlugin {
  return {
    point: LifecyclePoints.preRequest,
    async handler(route: string, request: ServiceRequestWithStart) {
      request.started = request.started || process.hrtime()
      return [route, request]
    },
  }
}
