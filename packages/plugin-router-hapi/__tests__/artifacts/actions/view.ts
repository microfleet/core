import { ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

export default function viewAction(request: ServiceRequest): any {
  return request.transportRequest.sendView('view', request.params)
}

viewAction.schema = false
viewAction.transports = [ActionTransport.http]
