import { ActionTransport } from '@microfleet/plugin-router'
import type { ServiceRequest } from '@microfleet/plugin-router'

export default async function headersAction(request: ServiceRequest): Promise<any> {
  request.setReplyHeader('x-error', 'websocket events do not have headers')

  return {
    status: 'success',
  }
}
headersAction.schema = false
headersAction.transports = [ActionTransport.socketio]
