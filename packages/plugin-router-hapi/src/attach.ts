import * as get from 'get-value'
import { Request, ResponseToolkit, Server, ServerRegisterPluginObject } from '@hapi/hapi'
import { defaults, omit } from 'lodash'
import { Microfleet } from '@microfleet/core'
import { Router, RouterPlugin, ActionTransport, ServiceAction } from '@microfleet/plugin-router'

import hapiRouterAdapter from './adapter'
import { fromNameToPath, fromPathToName } from './utils/action-name'
import type { RouterHapiPluginConfig } from './types/plugin'

function attachRequestCountEvents(server: Server, router: Router) {
  const { http } = ActionTransport
  const { requestCountTracker } = router

  /* Hapi not emitting request event */
  /* Using Extension */
  const onRequest = (_: Request, h: ResponseToolkit) => {
    requestCountTracker.increase(http)
    return h.continue
  }

  /* But emit's 'response' event */
  const onResponse = () => {
    requestCountTracker.decrease(http)
  }

  const onStop = () => {
    server.events.removeListener('response', onResponse)
  }

  server.ext('onRequest', onRequest)
  server.events.on('response', onResponse)
  server.events.on('stop', onStop)
}

export default function attachRouter(service: Microfleet & RouterPlugin, config: RouterHapiPluginConfig): ServerRegisterPluginObject<any> {
  return {
    plugin: {
      name: 'microfleetRouter',
      version: '1.0.0',
      async register(server: Server) {
        for (const [actionName, handler] of service.router.getRoutes(ActionTransport.http).entries()) {
          const path = fromNameToPath(actionName, config.prefix)
          const defaultOptions = {
            path,
            handler: hapiRouterAdapter(actionName, service),
            method: ['GET', 'POST'],
          }

          const hapiTransportOptions = get(handler as ServiceAction, 'transportOptions.handlers.hapi', Object.create(null))
          const handlerOptions = omit(hapiTransportOptions, ['path', 'handler'])

          server.route(defaults(handlerOptions, defaultOptions))
        }

        server.route({
          method: ['GET', 'POST'],
          path: '/{any*}',
          async handler(request: Request) {
            const actionName = fromPathToName(request.path, config.prefix)
            const handler = hapiRouterAdapter(actionName, service)
            return handler(request)
          },
        })

        attachRequestCountEvents(server, service.router)
      },
    },
  }
}
