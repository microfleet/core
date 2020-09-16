import assert = require('assert')
import { NotPermittedError } from 'common-errors'
import { Plugin, Server, ServerOptions } from '@hapi/hapi'
import Joi = require('@hapi/joi')
import { ActionTransport, Microfleet } from '../../../..'
import { PluginInterface } from '../../../../types'
import attachRouter, { HapiRouterConfig } from './router/attach'
import * as RequestTracker from '../../../router/request-tracker'

export interface HapiPlugin {
  plugin: string | Plugin<any>;
  options?: any;
  once?: boolean;
}

const defaultPlugins: HapiPlugin[] = [{
  options: {},
  plugin: './plugins/redirect',
}, {
  options: {},
  plugin: './plugins/state',
}]

export interface HapiPluginConfig {
  server: {
    handlerConfig: {
      server: ServerOptions
      plugins: {
        list: any[]
        options?: any
      }
      views?: any
    }
    host?: string
    port?: number
    attachSocketio?: boolean
  }
  router: HapiRouterConfig & {
    enabled: boolean
  }
}

function createHapiServer(config: HapiPluginConfig, service: Microfleet): PluginInterface {
  const { handlerConfig } = config.server
  handlerConfig.server.address = config.server.host || '0.0.0.0'
  handlerConfig.server.port = config.server.port ? config.server.port : 0

  assert(service.hasPlugin('logger'), 'must include logger plugin')

  const server = service.http = new Server(handlerConfig.server)

  server.validator(Joi)

  let routerPlugin: HapiPlugin
  if (config.router.enabled) {
    routerPlugin = attachRouter(service, config.router)
  }

  // exposes microfleet inside the server for tighter integrations
  server.decorate('server', 'microfleet', service as any)

  async function initPlugins() {
    const { list, options } = handlerConfig.plugins
    const plugins = defaultPlugins.concat(list)

    if (handlerConfig.views) {
      plugins.push({
        options: {},
        plugin: '@hapi/vision',
      })

      plugins.push({
        options: handlerConfig.views,
        plugin: './plugins/views',
      })
    }

    if (routerPlugin !== undefined) {
      plugins.push(routerPlugin)
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

  async function startServer() {
    if (config.server.attachSocketio) {
      if (!service.socketio) {
        throw new NotPermittedError('socket.io plugin not found')
      }

      service.socketio.attach(server.listener)
    }

    await initPlugins()
    await server.start()

    service.log.info(
      { transport: 'http', http: '@hapi/hapi' },
      'listening on http://%s:%s',
      handlerConfig.server.address,
      server.info.port
    )

    service.emit('plugin:start:http', server)

    return server
  }

  function getRequestCount() {
    return RequestTracker.getRequestCount(service, ActionTransport.http)
  }

  async function stopServer() {
    const { started } = server.info

    if (started) {
      /* Socket depends on Http transport. Wait for its requests here */
      /* Call of socketio.close() causes all active connections close */
      if (config.server.attachSocketio) {
        await RequestTracker.waitForRequestsToFinish(service, ActionTransport.socketio)
      }

      /* Server waits for connection finish anyway */
      await server.stop()
    }
    service.emit('plugin:stop:http', server)
  }

  return {
    getRequestCount,
    close: stopServer,
    connect: startServer,
  }
}

export default createHapiServer
