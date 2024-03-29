import type * as _ from '@microfleet/plugin-socketio'
import type * as __ from '@microfleet/plugin-router'
import { strict as assert } from 'assert'
import { Microfleet, PluginTypes } from '@microfleet/core'
import type { Socket } from 'socket.io'
import attachSocketioRouter from './attach'

declare module '@microfleet/plugin-router' {
  export interface ServiceRequest {
    socket?: Socket
  }
}

export const name = 'routerSocketio'
export const type = PluginTypes.transport
export const priority = 30 // after plugin-socketio and plugin router

export const attach = function attachRouterSocketioPlugin(this: Microfleet): void {
  assert(this.hasPlugin('router'), 'router plugin is required')
  assert(this.hasPlugin('socketio'), 'socketio plugin is required')
  assert(this.hasPlugin('logger'), 'logger plugin is required')

  attachSocketioRouter(this.socketio, this.router, this.log)
}
