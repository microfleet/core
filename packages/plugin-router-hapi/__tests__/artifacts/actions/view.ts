import { ActionTransport } from '@microfleet/core'
import type { ServiceRequest } from '@microfleet/core-types'

export default function viewAction(request: ServiceRequest): any {
  return request.transportRequest.sendView('view', request.params)
}

viewAction.schema = false
viewAction.transports = [ActionTransport.http]
