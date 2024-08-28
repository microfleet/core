import { Socket } from 'socket.io'
import { Logger } from '@microfleet/plugin-logger'
import { Router, ActionTransport } from '@microfleet/plugin-router'
import { SocketIoServiceRequest } from './service-request'

/* Decrease request count on response */
const decreaseRequestCount = (router: Router) => {
  router.requestCountTracker.decrease(ActionTransport.socketio)
}

function createServiceRequest(actionName: string, params: any, callback: any, socket: Socket) {
  return new (SocketIoServiceRequest as any)(
    actionName, // route
    params,
    [actionName, params, callback], // transportRequest
    socket
  )
}

function getSocketIORouterAdapter(router: Router, log: Logger): (socket: Socket) => void {
  return function socketIORouterAdapter(socket: Socket): void {
    socket.onAny(async (actionName: string, params: unknown, callback: CallableFunction): Promise<void> => {
      if (typeof callback !== 'function') {
        // ignore malformed rpc call
        log.warn({ actionName, params, callback }, 'malformed rpc call')
        return
      }

      const request = createServiceRequest(actionName, params, callback, socket)

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
