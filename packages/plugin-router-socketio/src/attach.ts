import { ActionTransport } from '@microfleet/utils'
import type { Router } from '@microfleet/core/lib/plugins/router/factory'
import { verifyAttachPossibility } from '@microfleet/core/lib/plugins/router/verifyAttachPossibility'
import getSocketIORouterAdapter from './adapter'
import { Server } from 'socket.io'

function attachSocketIORouter(socketIO: Server, config: unknown, router: Router): void {
  verifyAttachPossibility(router, ActionTransport.socketio)
  socketIO.on('connection', getSocketIORouterAdapter(config, router))
}

export default attachSocketIORouter
