// @todo @microfleet/test-tools
import { ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

export default async function echoAction(request: ServiceRequest): Promise<any> {
  return request.params
}

echoAction.schema = false
echoAction.transports = [ActionTransport.socketio]
