import { NotSupportedError } from 'common-errors'

import { Lifecycle } from '../../lifecycle'
import { ServiceRequest } from '../../types/router'
import { RequestDataKey, ActionTransport } from '../../router'

declare module '../../types/router' {
  interface ServiceAction {
    transportsOptions?: TransportsOptions
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TransportsOptions extends Partial<Record<keyof typeof ActionTransport, TransportsTransportOptions>> {}

export type TransportsTransportOptions = {
  methods?: (keyof typeof RequestDataKey)[]
}

async function postRequest(request: ServiceRequest): Promise<void> {
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

  const { methods } = transportOptions

  if (methods === undefined) {
    return
  }

  if (!methods.includes(method)) {
    throw new NotSupportedError(`Route ${request.route} method ${method}`)
  }

  return
}

export default [{
  handler: postRequest,
  point: Lifecycle.hooks.postRequest,
}]
