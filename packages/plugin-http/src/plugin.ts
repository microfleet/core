/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as _ from '@microfleet/plugin-logger'
import type * as __ from '@microfleet/plugin-validator'
import type * as ___ from '@microfleet/plugin-socketio'
/* eslint-enable @typescript-eslint/no-unused-vars */

import type { PluginInterface } from '@microfleet/core-types'
import { strict as assert } from 'assert'
import { resolve } from 'path'
import { Microfleet, PluginTypes } from '@microfleet/core'

// @todo dynamic import?
import { attach as attachHapiPlugin, Server } from '@microfleet/plugin-hapi'
import { HTTPPluginConfig } from './types/plugin'

declare module '@microfleet/core-types' {
  interface Microfleet {
    http: Server
  }

  interface ConfigurationOptional {
    http: HTTPPluginConfig
  }
}

export const name = 'http'
export const type = PluginTypes.transport
export const priority = 0

// @todo BC ONLY, SHOULD BE REFACTORED
export function attach(
  this: Microfleet,
  options: Partial<HTTPPluginConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('validator'), 'validator module must be included')

  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.config.http = this.validator.ifError<HTTPPluginConfig>('http', options)
  const { server } = config
  // share http configuration between plugins

  if (server.handler === 'hapi') {
    const plugin = attachHapiPlugin.call(this, {
      attachSocketio: server.attachSocketio,
      plugins: server.handlerConfig.plugins,
      server: {
        address: server.host || '0.0.0.0',
        port: server.port || 0,
        ...server.handlerConfig.server,
      },
      views: server.handlerConfig.views,
    })

    this.http = this.hapi

    return plugin
  }

  throw new Error(`${server.handler} is not supported`)
}
