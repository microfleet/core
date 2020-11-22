/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as _ from '@microfleet/plugin-socketio'
import type * as __ from '@microfleet/plugin-router'
/* eslint-enable @typescript-eslint/no-unused-vars */

import { strict as assert } from 'assert'
import { Microfleet, PluginTypes } from '@microfleet/core'
import attachSocketioRouter from './attach'

export const name = 'router-socketio'
export const type = PluginTypes.transport
export const priority = 101 // after plugin-socketio and plugin router

export const attach = function attachRouterSocketioPlugin(this: Microfleet): void {
  assert(this.hasPlugin('router'), 'router plugin is required')
  assert(this.hasPlugin('socketio'), 'socketio plugin is required')
  assert(this.hasPlugin('log'), 'log plugin is required')

  attachSocketioRouter(this.socketio, this.router, this.log)
}
