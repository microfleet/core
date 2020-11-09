import type { ServiceRequest } from '@microfleet/core-types'
import { LifecyclePoints } from '..'

export type ServiceRequestWithSchema = ServiceRequest & {
  schema?: string;
}

export default [{
  point: LifecyclePoints.postRequest,
  async handler(error: Error | null, request: ServiceRequestWithSchema): Promise<[null, ServiceRequestWithSchema]> {
    if (error) {
      throw error
    }

    const { action } = request

    if (action.schema === undefined) {
      action.schema = action.actionName
    }

    if (action.responseSchema === undefined) {
      action.responseSchema = `response.${action.actionName}`
    }

    return [error, request]
  },
}]
