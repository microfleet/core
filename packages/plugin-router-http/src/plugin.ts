import { strict as assert } from 'assert'
import { resolve } from 'path'
import { Microfleet, PluginTypes, ValidatorPlugin } from '@microfleet/core'
// @todo dynamic import?
import { HTTPPlugin } from '@microfleet/plugin-http'
import { attach as attachRouterHapiPlugin } from '@microfleet/plugin-router-hapi'

import { RouterHTTPPluginConfig } from './types/plugin'

export const name = 'router-http'
export const type = PluginTypes.transport
export const priority = 101 // should be after plugin-http and plugin router

export function attach(
  this: Microfleet & ValidatorPlugin & HTTPPlugin,
  options: Partial<RouterHTTPPluginConfig> = {}
): void {
  assert(this.hasPlugin('validator'), 'validator module must be included')
  assert(this.hasPlugin('http'), 'http module must be included')

  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError('router-http', options) as RouterHTTPPluginConfig
  const { handler } = this.config.http.server

  if (handler === 'hapi') {
    return attachRouterHapiPlugin.call(this, config)
  }

  throw new Error(`${handler} is not supported`)
}
