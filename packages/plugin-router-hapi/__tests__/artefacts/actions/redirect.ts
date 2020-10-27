import { ActionTransport, ServiceRequest } from '@microfleet/core'

export default function redirectAction(request: ServiceRequest): any {
  return request.transportRequest.redirect('success')
}

redirectAction.schema = false
redirectAction.transports = [ActionTransport.http]
