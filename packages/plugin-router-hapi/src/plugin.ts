import type * as _ from '@microfleet/plugin-hapi'
import type * as __ from '@microfleet/plugin-validator'
import { strict as assert } from 'assert'
import { resolve } from 'path'
import { Microfleet, PluginTypes } from '@microfleet/core'

import attachRouter from './attach'
import { RouterHapiPluginConfig } from './types/plugin'
import { PluginInterface } from '@microfleet/core-types'

export const name = 'routerHapi'
export const type = PluginTypes.transport
export const priority = 30 // should be after plugin-hapi and plugin router

declare module '@microfleet/core-types' {
  interface ConfigurationOptional {
    routerHapi: RouterHapiPluginConfig
  }
}

/**
 * Attaches HTTP handler.
 * @param config - HTTP handler configuration to attach.
 */
export function attach(
  this: Microfleet,
  options: Partial<RouterHapiPluginConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('validator'), 'validator module must be included')

  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError<RouterHapiPluginConfig>('router-hapi', options)
  const routerPlugin = attachRouter(this, config)

  return {
    async connect(this: Microfleet) {
      await this.hapi.register(routerPlugin)
    }
  }
}
