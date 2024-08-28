import { ActionTransport } from '@microfleet/plugin-router'
import type { ServiceRequest } from '@microfleet/plugin-router'

export default async function invalidHeadersAction(request: ServiceRequest): Promise<any> {
  request.setReplyHeader('x-valid', 'should not be present')
  request.setReplyHeader(request.params.key, request.params.value)

  return {
    response: 'success',
  }
}

invalidHeadersAction.schema = false
invalidHeadersAction.transports = [ActionTransport.amqp]
