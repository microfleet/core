/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as _ from '@microfleet/plugin-http'
import type * as __ from '@microfleet/plugin-validator'
/* eslint-enable @typescript-eslint/no-unused-vars */

import { strict as assert } from 'assert'
import { resolve } from 'path'
import { Microfleet, PluginTypes } from '@microfleet/core'
import { attach as attachRouterHapiPlugin } from '@microfleet/plugin-router-hapi'
import { RouterHTTPPluginConfig } from './types/plugin'

export const name = 'router-http'
export const type = PluginTypes.transport
export const priority = 1 // should be after plugin-http

export function attach(
  this: Microfleet,
  options: Partial<RouterHTTPPluginConfig> = {}
): void {
  assert(this.hasPlugin('validator'), 'validator module must be included')
  assert(this.hasPlugin('http'), 'http module must be included')

  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError<RouterHTTPPluginConfig>('router-http', options)
  const { handler } = this.config.http.server

  if (handler === 'hapi') {
    return attachRouterHapiPlugin.call(this, config)
  }

  throw new Error(`${handler} is not supported`)
}
