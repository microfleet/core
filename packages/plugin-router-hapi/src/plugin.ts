import type * as _ from '@microfleet/plugin-hapi'
import type * as __ from '@microfleet/plugin-validator'
import { strict as assert } from 'assert'
import { resolve } from 'path'
import { Microfleet, PluginTypes } from '@microfleet/core'

import attachRouter from './attach'
import { RouterHapiPluginConfig } from './types/plugin'

export const name = 'router-hapi'
export const type = PluginTypes.transport
export const priority = 101 // should be after plugin-hapi and plugin router

/**
 * Attaches HTTP handler.
 * @param config - HTTP handler configuration to attach.
 */
export function attach(
  this: Microfleet,
  options: Partial<RouterHapiPluginConfig> = {}
): void {
  assert(this.hasPlugin('validator'), 'validator module must be included')

  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError<RouterHapiPluginConfig>('router-hapi', options)
  const routerPlugin = attachRouter(this, config)

  this.hapi.register(routerPlugin)
}
