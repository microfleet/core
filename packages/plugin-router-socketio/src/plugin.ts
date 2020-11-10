/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as _ from '@microfleet/plugin-socketio'
import type * as __ from '@microfleet/core/lib/plugins/router'
/* eslint-enable @typescript-eslint/no-unused-vars */

import { NotFoundError } from 'common-errors'
import { strict as assert } from 'assert'
import { Microfleet, PluginTypes } from '@microfleet/core'
import attachSocketioRouter from './attach'

export const name = 'router-socketio'
export const type = PluginTypes.transport
export const priority = 200 // after plugin-socketio

export const attach = function attachRouterSocketioPlugin(
  this: Microfleet,
  config: any = {}
): void {

  assert(this.hasPlugin('socketio'), new NotFoundError('socketio plugin must be included'))
  assert(this.hasPlugin('router'), new NotFoundError('router plugin must be included'))

  attachSocketioRouter(this.socketio, config, this.router)
}
