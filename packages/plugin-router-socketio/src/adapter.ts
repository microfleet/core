import { Socket } from 'socket.io'
import { noop } from 'lodash'
import { Logger } from '@microfleet/plugin-logger'
import { Router, ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

/* Decrease request count on response */
const decreaseRequestCount = (router: Router) => {
  router.requestCountTracker.decrease(ActionTransport.socketio)
}

function getSocketIORouterAdapter(router: Router, log: Logger): (socket: Socket) => void {
  return function socketIORouterAdapter(socket: Socket): void {
    socket.onAny(async (actionName: string, params: unknown, callback: CallableFunction): Promise<void> => {
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
        parentSpan: null,
        query: Object.create(null),
        route: actionName,
        span: null,
        transport: ActionTransport.socketio,
        transportRequest: [actionName, params, callback],
        reformatError: true,
      }

      /* Increase request count on message */
      router.requestCountTracker.increase(ActionTransport.socketio)
      try {
        callback(null, await router.dispatch(request))
      } catch (e: any) {
        callback(e)
      } finally {
        decreaseRequestCount(router)
      }
    })
  }
}

export default getSocketIORouterAdapter
