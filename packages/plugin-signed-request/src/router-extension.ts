import { Microfleet } from '@microfleet/core-types'
import { ActionTransport, Lifecycle, LifecycleExtension, ServiceRequest } from '@microfleet/plugin-router'

export const extendServiceRequest: LifecycleExtension = {
  point: Lifecycle.hooks.preRequest,
  async handler(this: Microfleet, request: ServiceRequest): Promise<void> {
    if (request.transport === ActionTransport.http) {
      const { transportRequest } = request
      if (transportRequest?.plugins?.signedRequest) {
        request.signature = transportRequest.plugins.signedRequest
      }
    }
  },
}
