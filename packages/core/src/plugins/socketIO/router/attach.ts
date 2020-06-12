import { ActionTransport } from '../../..'
import { Router } from '../../router/factory'
import { verifyAttachPossibility } from '../../router/verifyAttachPossibility'
import getSocketIORouterAdapter from './adapter'
import wildcard = require('socketio-wildcard')
import type { Server, ServerOptions } from 'socket.io'

function attachSocketIORouter(socketIO: Server, config: unknown, router: Router): void {
  verifyAttachPossibility(router, ActionTransport.socketIO)

  // include adapter
  const wildcardMiddleware = wildcard()

  // due to changes in socket.io@2.0.2 we must attach server before using .use for adding middleware
  // otherwise it crashes
  const { attach } = socketIO

  // NOTE: overwrites listen & attach functions so that we can init middleware after we have connected
  // a server to socket.io instance
  socketIO.attach = socketIO.listen = function listen(srv: any | number, opts?: ServerOptions): Server {
    attach.call(this, srv, opts)
    socketIO.use(wildcardMiddleware)
    return this
  }

  socketIO.on('connection', getSocketIORouterAdapter(config, router))
}

export default attachSocketIORouter
