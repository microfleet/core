import { ActionTransport, ServiceRequest } from '@microfleet/core'

export default function redirectAction(request: ServiceRequest): any {
  return request.transportRequest.redirect('https://google.com')
}

redirectAction.schema = false
redirectAction.transports = [ActionTransport.http]
