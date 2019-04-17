import { ServiceRequestInterface } from '../../../../types'
import { LifecyclePoints } from '..'

export type ServiceRequestWithSchema = ServiceRequestInterface & {
  schema?: string;
}

export default [{
  point: LifecyclePoints.postRequest,
  async handler(error: Error, request: ServiceRequestWithSchema) {
    if (error) {
      throw error
    }

    const { action } = request

    if (action.schema === undefined) {
      action.schema = action.actionName
    }

    return [error, request]
  },
}]
