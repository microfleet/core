import { NotSupportedError } from 'common-errors'
import { Lifecycle } from '../../lifecycle'
import { ServiceRequest } from '../../types/router'

export type TransportOptionsAugmentedRequest = ServiceRequest & {
  action: ServiceRequest['action'] & {
    transportsOptions?: {
      [transport: string]: {
        methods: string[];
      };
    };
  };
}

async function postRequest(request: TransportOptionsAugmentedRequest): Promise<void> {
  if (request.error) {
    return
  }

  const { method, transport, action: { transportsOptions } } = request

  if (transportsOptions === undefined) {
    return
  }

  const transportOptions = transportsOptions[transport]

  if (transportOptions === undefined) {
    return
  }

  if (!transportOptions.methods.includes(method)) {
    throw new NotSupportedError(`Route ${request.route} method ${method}`)
  }

  return
}

export default [{
  handler: postRequest,
  point: Lifecycle.hooks.postRequest,
}]
