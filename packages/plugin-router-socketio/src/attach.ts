import { Router } from '@microfleet/core'

import getSocketIORouterAdapter from './adapter'
import wildcard = require('socketio-wildcard')
import type { Server, ServerOptions } from 'socket.io'

function attachSocketIORouter(socketio: Server, router: Router): void {
  // include adapter
  const wildcardMiddleware = wildcard()

  // due to changes in socket.io@2.0.2 we must attach server before using .use for adding middleware
  // otherwise it crashes
  const { attach } = socketio

  // NOTE: overwrites listen & attach functions so that we can init middleware after we have connected
  // a server to socket.io instance
  socketio.attach = socketio.listen = function listen(srv: any | number, opts?: ServerOptions): Server {
    attach.call(this, srv, opts)
    socketio.use(wildcardMiddleware)
    return this
  }

  socketio.on('connection', getSocketIORouterAdapter(router))
}

export default attachSocketIORouter
