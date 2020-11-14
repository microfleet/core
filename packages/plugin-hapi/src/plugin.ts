import { strict as assert } from 'assert'
import { resolve } from 'path'
import { Server } from '@hapi/hapi'
import * as Joi from 'joi'
import {
  ActionTransport,
  Microfleet,
  PluginInterface,
  ValidatorPlugin,
  PluginTypes,
} from '@microfleet/core'
import { LoggerPlugin } from '@microfleet/plugin-logger'
import { RequestCountTracker } from '@microfleet/plugin-router'
import { SocketIOPlugin } from '@microfleet/plugin-socketio'

import type { HapiPlugin, HapiPluginPlugin, HapiPluginConfig } from './types/plugin'

const defaultPlugins: HapiPluginPlugin[] = [{
  options: {},
  plugin: './plugins/redirect',
}, {
  options: {},
  plugin: './plugins/state',
}]

export const name = 'hapi'
export const type = PluginTypes.transport
export const priority = 0

export function attach(
  this: Microfleet & ValidatorPlugin & LoggerPlugin & SocketIOPlugin & HapiPlugin,
  options: Partial<HapiPluginConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('validator'), 'validator plugin must be included')
  assert(this.hasPlugin('logger'), 'logger plugin must be included')

  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError('hapi', options) as HapiPluginConfig

  config.server.address = config.server.address || '0.0.0.0'
  config.server.port = config.server.port || 0

  const server = this.hapi = new Server(config.server)

  server.validator(Joi)
  // exposes microfleet inside the server for tighter integrations
  server.decorate('server', 'microfleet', this as any)

  async function initPlugins() {
    const { list, options } = config.plugins
    const plugins = defaultPlugins.concat(list)

    if (config.views) {
      plugins.push({
        options: {},
        plugin: '@hapi/vision',
      })

      plugins.push({
        options: config.views,
        plugin: './plugins/views',
      })
    }

    const registrations = []

    for (const pluguinConfiguration of plugins) {
      registrations.push({
        options: pluguinConfiguration.options,
        plugin: typeof pluguinConfiguration.plugin === 'string'
          ? require(pluguinConfiguration.plugin)
          : pluguinConfiguration.plugin,
      })
    }

    return server.register(registrations, options)
  }

  const startServer = async () => {
    if (config.attachSocketio) {
      assert(this.hasPlugin('socketio'), 'socketio plugin must be included')

      this.socketio.attach(server.listener)
    }

    await initPlugins()
    await server.start()

    this.log.info(
      { transport: 'http', http: '@hapi/hapi' },
      'listening on http://%s:%s',
      config.server.address,
      server.info.port
    )

    this.emit('plugin:start:http', server)

    return server
  }

  // @todo should be here?
  const getRequestCount = () => {
    return RequestCountTracker.getRequestCount(this, ActionTransport.http)
  }

  const stopServer = async () => {
    const { started } = server.info

    if (started) {
      /* Socket depends on Http transport. Wait for its requests here */
      /* Call of socketio.close() causes all active connections close */
      if (config.attachSocketio) {
        await RequestCountTracker.waitForRequestsToFinish(this, ActionTransport.socketio)
      }

      /* Server waits for connection finish anyway */
      await server.stop()
    }

    this.emit('plugin:stop:http', server)
  }

  return {
    getRequestCount,
    close: stopServer,
    connect: startServer,
  }
}
