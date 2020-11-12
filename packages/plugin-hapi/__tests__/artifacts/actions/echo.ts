// @todo @microfleet/test-tools
import { ActionTransport } from '@microfleet/core'
import type { ServiceRequest } from '@microfleet/core-types'

export default function echoAction(request: ServiceRequest): any {
  return Promise.resolve(request.params)
}

echoAction.schema = false
echoAction.transports = [ActionTransport.socketio]
