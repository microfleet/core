import { ActionTransport } from '../../..'
import { Router } from '../../router/factory'
import verifyPossibility from '../../router/verifyAttachPossibility'
import getSocketIORouterAdapter from './adapter'
import wildcard = require('socketio-wildcard')

function attachSocketIORouter(socketIO: any, config: any, router: Router) {
  verifyPossibility(router, ActionTransport.socketIO)

  // include adapter
  const wildcardMiddleware = wildcard()

  // due to changes in socket.io@2.0.2 we must attach server before using .use for adding middleware
  // otherwise it crashes
  const { attach } = socketIO

  // NOTE: overwrites listen & attach functions so that we can init middleware after we have connected
  // a server to socket.io instance
  socketIO.attach = socketIO.listen = function listen(...args: any[]) {
    attach.apply(this, args)
    socketIO.use(wildcardMiddleware)
  }

  socketIO.on('connection', getSocketIORouterAdapter(config, router))
}

export default attachSocketIORouter
