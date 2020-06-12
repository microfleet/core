
import { LifecyclePoints, ExtensionPlugin } from '.'
import { ServiceRequest } from '../../../types'

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
