import { Server } from 'socket.io'
import { Router } from '@microfleet/plugin-router'
import { Logger } from '@microfleet/plugin-logger'
import getSocketIORouterAdapter from './adapter'

export default function attachSocketIORouter(socketIO: Server, router: Router, log: Logger): void {
  socketIO.on('connection', getSocketIORouterAdapter(router, log))
}
