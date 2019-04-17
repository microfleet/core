import _debug = require('debug')
import noop = require('lodash/noop')
import { ActionTransport } from '../../..'
import { Router } from '../../router/factory'
import { RequestCallback } from '../../router/dispatcher'
import { ServiceRequest } from '../../../utils/service-request';

const debug = _debug('mservice:router:socket.io')

export interface SocketIOMessage {
  data: [string, any, RequestCallback]
}

function getSocketIORouterAdapter(_: any, router: Router) {
  return function socketIORouterAdapter(socket: NodeJS.EventEmitter) {
    socket.on('*', (packet: SocketIOMessage) => {
      const [actionName, params, callback] = packet.data
      const request = new ServiceRequest(
        '',
        params,
        Object.create(null),
        Object.create(null),
        'socketio',
        ActionTransport.socketIO,
        packet,
        noop as any,
        Object.create(null),
        undefined,
        undefined,
        console as any,
        undefined,
        socket
      )

      debug('prepared request with', packet.data)

      router.dispatch.call(router, actionName, request, (...args: any) => {
        console.log('callback args are', args)

        return callback(...args)
      })
    })
  }
}

export default getSocketIORouterAdapter
