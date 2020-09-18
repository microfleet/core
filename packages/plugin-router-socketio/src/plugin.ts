import { strict as assert } from 'assert'
import { Microfleet, PluginTypes, RouterPlugin } from '@microfleet/core'

import type { SocketIOPlugin } from '@microfleet/plugin-socketio/lib/types/socketio'

import attachSocketioRouter from './attach'

export const name = 'router-socketio'
export const type = PluginTypes.transport
export const priority = 200 // after plugin-socketio

export const attach = function attachRouterSocketioPlugin(
  this: Microfleet & SocketIOPlugin & RouterPlugin
): void {
  assert(this.socketio)
  assert(this.router)

  attachSocketioRouter(this.socketio, this.router)
}
