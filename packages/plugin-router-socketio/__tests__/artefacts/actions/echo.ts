import { ActionTransport, ServiceRequest } from '@microfleet/core'

export default function echoAction(request: ServiceRequest): any {
  return Promise.resolve(request.params)
}

echoAction.schema = false
echoAction.transports = [ActionTransport.socketio]
