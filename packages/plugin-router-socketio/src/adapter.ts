import { Socket } from 'socket.io'
import { noop } from 'lodash'
import { Logger } from '@microfleet/plugin-logger'
import { Router, DispatchCallback, ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

declare module '@microfleet/core-types' {
  interface ServiceRequest {
    socket?: Socket;
  }
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

function getSocketIORouterAdapter(router: Router, log: Logger): (socket: Socket) => void {
  return function socketIORouterAdapter(socket: Socket): void {
    // @todo socket.onAny((actionName: string, params: unknown, callback?: DispatchCallback): void => {
    socket.onAny((actionName: string, params: unknown, callback: DispatchCallback): void => {
      // @todo if (callback !== undefined && typeof callback !== 'function') {
      if (typeof callback !== 'function') {
        // ignore malformed rpc call
        log.warn({ actionName, params, callback }, 'malformed rpc call')
        return
      }

      const request: ServiceRequest = {
        socket,
        params,
        action: noop as any,
        headers: Object.create(null),
        locals: Object.create(null),
        // @todo real logger
        log: console as any,
        method: 'socketio',
        parentSpan: undefined,
        query: Object.create(null),
        route: actionName,
        span: undefined,
        transport: ActionTransport.socketio,
        transportRequest: [actionName, params, callback],
      }
      const wrappedCallback = wrapCallback(router, callback)

      /* Increase request count on message */
      router.requestCountTracker.increase(ActionTransport.socketio)
      router.dispatch(request, wrappedCallback)
    })
  }
}

export default getSocketIORouterAdapter
