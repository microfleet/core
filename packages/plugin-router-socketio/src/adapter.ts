import createDebug from 'debug'
import { noop } from 'lodash'
import { Router, DispatchCallback, ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

const debug = createDebug('plugin-router-socketio')

export interface SocketIOMessage {
  data: [string, any, DispatchCallback]
}

/* Decrease request count on response */
function wrapCallback(router: Router, callback: DispatchCallback) {
  return (err: any, result?: any) => {
    router.requestCountTracker.decrease(ActionTransport.socketio)
    if (callback) {
      callback(err, result)
    }
  }
}

function getSocketIORouterAdapter(router: Router): (socket: NodeJS.EventEmitter) => void {
  return function socketIORouterAdapter(socket: NodeJS.EventEmitter) {
    socket.on('*', (packet: SocketIOMessage) => {
      /* Increase request count on message */
      router.requestCountTracker.increase(ActionTransport.socketio)

      const [actionName, params, callback] = packet.data
      const request: ServiceRequest = {
        socket,
        params,
        action: noop as any,
        headers: Object.create(null),
        locals: Object.create(null),
        log: console as any,
        method: 'socketio',
        parentSpan: undefined,
        query: Object.create(null),
        route: actionName,
        span: undefined,
        transport: ActionTransport.socketio,
        transportRequest: packet,
      }

      debug('prepared request with', packet.data)
      const wrappedCallback = wrapCallback(router, callback)
      router.dispatch.call(router, actionName, request, wrappedCallback)
    })
  }
}

export default getSocketIORouterAdapter
