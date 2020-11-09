import noop = require('lodash/noop')
import { ActionTransport } from '@microfleet/utils'
import type { ServiceRequest } from '@microfleet/core-types'
import { Router } from '../../router/factory'
import { RequestCallback } from '../../router/dispatcher'
import { Socket } from 'socket.io'

const { socketIO } = ActionTransport

declare module '@microfleet/core-types' {
  interface ServiceRequest {
    socket?: Socket;
  }
}

/* Decrease request count on response */
function wrapCallback(router: Router, callback?: RequestCallback) {
  return (err: any, result?: any) => {
    router.requestCountTracker.decrease(socketIO)
    if (callback) {
      callback(err, result)
    }
  }
}

function getSocketIORouterAdapter(_: unknown, router: Router): (socket: Socket) => void {
  const { log } = router.service
  return function socketIORouterAdapter(socket: Socket): void {
    socket.onAny((actionName: string, params: unknown, callback?: RequestCallback): void => {

      if (callback != undefined && typeof callback !== 'function') {
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
        log: console as any,
        method: 'socketio',
        parentSpan: undefined,
        query: Object.create(null),
        route: '',
        span: undefined,
        transport: socketIO,
        transportRequest: null,
      }

      /* Increase request count on message */
      router.requestCountTracker.increase(socketIO)
      const wrappedCallback = wrapCallback(router, callback)
      router.dispatch(actionName, request, wrappedCallback)
    })
  }
}

export default getSocketIORouterAdapter
