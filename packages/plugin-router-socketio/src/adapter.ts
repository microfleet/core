import noop = require('lodash/noop')
import { ActionTransport } from '@microfleet/utils'
import type { ServiceRequest } from '@microfleet/core-types'
import { Socket } from 'socket.io'

const { socketio } = ActionTransport

import type { Router } from '@microfleet/core/lib/plugins/router/factory'
import type { RequestCallback } from '@microfleet/core/lib/plugins/router/dispatcher'

declare module '@microfleet/core-types' {
  interface ServiceRequest {
    socket?: Socket;
  }
}

/* Decrease request count on response */
function wrapCallback(router: Router, callback?: RequestCallback) {
  return (err: any, result?: any) => {
    router.requestCountTracker.decrease(socketio)
    if (callback) {
      callback(err, result)
    }
  }
}

function getSocketIORouterAdapter(_: unknown, router: Router): (socket: Socket) => void {
  const { log } = router.service
  return function socketIORouterAdapter(socket: Socket): void {
    socket.onAny((actionName: string, params: unknown, callback?: RequestCallback): void => {

      if (callback !== undefined && typeof callback !== 'function') {
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
        transport: socketio,
        transportRequest: [actionName, params, callback],
      }

      /* Increase request count on message */
      router.requestCountTracker.increase(socketio)
      const wrappedCallback = wrapCallback(router, callback)
      router.dispatch(actionName, request, wrappedCallback)
    })
  }
}

export default getSocketIORouterAdapter
