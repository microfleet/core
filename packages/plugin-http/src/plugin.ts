import { strict as assert } from 'assert'
import { resolve } from 'path'
import { Microfleet, PluginTypes, ValidatorPlugin, PluginInterface } from '@microfleet/core'
// @todo dynamic import?
import { attach as attachHapiPlugin } from '@microfleet/plugin-hapi'

import { HTTPPlugin, HTTPPluginConfig } from './types/plugin'

export const name = 'http'
export const type = PluginTypes.transport
export const priority = 0

// @todo BC ONLY, SHOULD BE REFACTORED
export function attach(
  this: Microfleet & ValidatorPlugin & HTTPPlugin,
  options: Partial<HTTPPluginConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('validator'), 'validator module must be included')

  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const { server } = this.validator.ifError('http', options) as HTTPPluginConfig

  if (server.handler === 'hapi') {
    const plugin = attachHapiPlugin.call(this, {
      attachSocketio: server.attachSocketio,
      plugins: server.handlerConfig.plugins,
      server: {
        address: server.host || '0.0.0.0',
        port: server.port || 3000,
        ...server.handlerConfig.server,
      },
      views: server.handlerConfig.views,
    })

    this.http = this.hapi

    return plugin
  }

  throw new Error(`${server.handler} is not supported`)
}
