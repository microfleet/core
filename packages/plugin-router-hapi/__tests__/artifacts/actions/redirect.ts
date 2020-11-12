import { ActionTransport } from '@microfleet/core'
import type { ServiceRequest } from '@microfleet/core-types'

export default function redirectAction(request: ServiceRequest): any {
  return request.transportRequest.redirect('success')
}

redirectAction.schema = false
redirectAction.transports = [ActionTransport.http]
