import _debug = require('debug')
import noop = require('lodash/noop')
import { ActionTransport } from '../../..'
import { ServiceRequest } from '../../../types'
import { Router } from '../../router/factory'
import { RequestCallback } from '../../router/dispatcher'

const debug = _debug('mservice:router:socket.io')
const { socketIO } = ActionTransport

export interface SocketIOMessage {
  data: [string, any, RequestCallback]
}

function getSocketIORouterAdapter(_: any, router: Router) {
  return function socketIORouterAdapter(socket: NodeJS.EventEmitter) {
    socket.on('*', (packet: SocketIOMessage) => {
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

      // Object.defineProperty(request, 'setHeader', {
      //   // tslint:disable-next-line
      //   value: (key: string, value: string) => { console.log(`SOCKET IO called setHeader(${key}, ${value})`) },
      // })
      //
      // Object.defineProperty(request, 'getHeader', {
      //   // tslint:disable-next-line
      //   value: (key: string) => { console.log(`SOCKET IO called getHeader(${key})`) },
      // })

      debug('prepared request with', packet.data)

      router.dispatch.call(router, actionName, request, callback)
    })
  }
}

export default getSocketIORouterAdapter
