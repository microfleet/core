import { strict as assert } from 'assert'
import { resolve } from 'path'
import { Microfleet, PluginTypes, ValidatorPlugin } from '@microfleet/core'
import { HapiPlugin } from '@microfleet/plugin-hapi'

import attachRouter from './attach'
import { RouterHapiPluginConfig } from './types/plugin'

export const name = 'router-hapi'
export const type = PluginTypes.transport
export const priority = 1 // should be after plugin-hapi

/**
 * Attaches HTTP handler.
 * @param config - HTTP handler configuration to attach.
 */
export function attach(
  this: Microfleet & ValidatorPlugin & HapiPlugin,
  options: Partial<RouterHapiPluginConfig> = {}
): void {
  assert(this.hasPlugin('validator'), 'validator module must be included')

  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError('router-hapi', options) as RouterHapiPluginConfig
  const routerPlugin = attachRouter(this, config)

  this.hapi.register(routerPlugin)
}
