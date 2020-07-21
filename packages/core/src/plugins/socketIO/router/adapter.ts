import _debug = require('debug')
import noop = require('lodash/noop')
import { Socket } from 'socket.io'

import { ActionTransport } from '../../..'
import { ServiceRequest } from '../../../types'
import { Router } from '../../router/factory'
import { RequestCallback } from '../../router/dispatcher'

const debug = _debug('mservice:router:socket.io')
const { socketIO } = ActionTransport

export interface SocketIOMessage {
  data: [string, any, RequestCallback];
}

/* Decrease request count on response */
function wrapCallback(router: Router, callback: RequestCallback) {
  return (err: any, result?: any) => {
    router.requestCountTracker.decrease(socketIO)
    if (callback) {
      callback(err, result)
    }
  }
}

function getSocketIORouterAdapter(_: unknown, router: Router): (socket: Socket) => void {
  return function socketIORouterAdapter(socket: Socket) {
    socket.on('*', (packet: SocketIOMessage) => {
      /* Increase request count on message */
      router.requestCountTracker.increase(socketIO)

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
        transport: socketIO,
        transportRequest: packet,
      }

      debug('prepared request with', packet.data)
      const wrappedCallback = wrapCallback(router, callback)
      router.dispatch.call(router, actionName, request, wrappedCallback)
    })
  }
}

export default getSocketIORouterAdapter
