import { strict as assert } from 'assert'
import { Microfleet, PluginTypes } from '@microfleet/core'
import { RouterPlugin } from '@microfleet/plugin-router'

import type { SocketIOPlugin } from '@microfleet/plugin-socketio'

import attachSocketioRouter from './attach'

export const name = 'router-socketio'
export const type = PluginTypes.transport
export const priority = 101 // after plugin-socketio and plugin router

export const attach = function attachRouterSocketioPlugin(
  this: Microfleet & SocketIOPlugin & RouterPlugin
): void {
  assert(this.socketio)
  assert(this.router)

  attachSocketioRouter(this.socketio, this.router)
}
