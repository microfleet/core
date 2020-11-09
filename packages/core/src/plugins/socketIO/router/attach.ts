import { ActionTransport } from '@microfleet/utils'
import { Router } from '../../router/factory'
import { verifyAttachPossibility } from '../../router/verifyAttachPossibility'
import getSocketIORouterAdapter from './adapter'
import { Server } from 'socket.io'

function attachSocketIORouter(socketIO: Server, config: unknown, router: Router): void {
  verifyAttachPossibility(router, ActionTransport.socketIO)

  socketIO.on('connection', getSocketIORouterAdapter(config, router))
}

export default attachSocketIORouter
