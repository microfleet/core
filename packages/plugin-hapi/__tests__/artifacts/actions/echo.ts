// @todo @microfleet/test-tools
import { ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

export default function echoAction(request: ServiceRequest): Promise<any> {
  return Promise.resolve(request.params)
}

echoAction.schema = false
echoAction.transports = [ActionTransport.socketio]
