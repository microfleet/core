import { LifecyclePoints } from '.'
import { ServiceRequestInterface } from '../../../types'

interface RequestStartExtension {
  started: [number, number];
  executionTotal: [number, number];
}
export type ServiceRequestWithStart = ServiceRequestInterface & RequestStartExtension

export function storeRequestTimeFactory() {
  return {
    point: LifecyclePoints.preRequest,
    async handler(route: string, request: ServiceRequestWithStart) {
      request.started = request.started || process.hrtime()
      return [route, request]
    },
  }
}
