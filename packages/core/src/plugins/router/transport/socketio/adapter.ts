import _debug = require('debug')
import noop = require('lodash/noop')

import { ActionTransport } from '../../../..'
import { ServiceRequest } from '../../../../types'
import { Router } from '../../../router/factory'
import { RequestCallback } from '../../../router/dispatcher'

const debug = _debug('mservice:router:socket.io')

export interface SocketIOMessage {
  data: [string, any, RequestCallback];
}

/* Decrease request count on response */
function wrapCallback(router: Router, callback: RequestCallback) {
  return (err: any, result?: any) => {
    router.requestCountTracker.decrease(ActionTransport.socketio)
    if (callback) {
      callback(err, result)
    }
  }
}

function getSocketIORouterAdapter(_: unknown, router: Router): (socket: NodeJS.EventEmitter) => void {
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
        route: '',
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
