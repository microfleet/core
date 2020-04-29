import assert = require('assert')
import { NotPermittedError } from 'common-errors'
import { Plugin, Server } from '@hapi/hapi'
import Joi = require('@hapi/joi')
import { ActionTransport, Microfleet } from '../../../..'
import { PluginInterface } from '../../../../types'
import attachRouter from './router/attach'
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

function createHapiServer(config: any, service: Microfleet): PluginInterface {
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
    for (const pluginConfiguration of plugins) {
      registrations.push({
        options: pluginConfiguration.options,
        plugin: typeof pluginConfiguration.plugin === 'string'
          ? require(pluginConfiguration.plugin)
          : pluginConfiguration.plugin,
      })
    }

    return server.register(registrations, options)
  }

  async function startServer() {
    if (config.server.attachSocketIO) {
      if (!service.socketIO) {
        throw new NotPermittedError('SocketIO plugin not found')
      }

      service.socketIO.listen(server.listener, (service.config.socketIO as any)?.options)
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
      /* Call of socketIO.close() causes all active connections close */
      if (config.server.attachSocketIO) {
        await RequestTracker.waitForRequestsToFinish(service, ActionTransport.socketIO)
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
