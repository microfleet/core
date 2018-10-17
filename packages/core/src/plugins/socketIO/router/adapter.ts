import _debug = require('debug')
import noop = require('lodash/noop')
import { ActionTransport } from '../../..'
import { ServiceRequest } from '../../../types'
import { MicrofleetRouter } from '../../router/factory'

const debug = _debug('mservice:router:socket.io')
const { socketIO } = ActionTransport

export interface SocketIOMessage {
  data: [string, any, () => any | null]
}

function getSocketIORouterAdapter(_: any, router: MicrofleetRouter) {
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

      debug('prepared request with', packet.data)

      return router.dispatch.call(router, actionName, request, callback)
    })
  }
}

export default getSocketIORouterAdapter
