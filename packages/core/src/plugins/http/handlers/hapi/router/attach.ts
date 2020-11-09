import type { Microfleet } from '@microfleet/core-types'

import get = require('get-value')
import { Request, ResponseToolkit, Server } from '@hapi/hapi'
import defaults = require('lodash/defaults')
import omit = require('lodash/omit')
import { HapiPlugin } from '../'
import { ActionTransport } from '../../../../..'
import { verifyAttachPossibility } from '../../../../router/verifyAttachPossibility'
import { fromNameToPath, fromPathToName } from '../../../helpers/actionName'
import hapiRouterAdapter from './adapter'

function attachRequestCountEvents(server: Server, router: Microfleet['router']) {
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

export interface HapiRouterConfig {
  prefix: string
}

export default function attachRouter(service: Microfleet, config: HapiRouterConfig): HapiPlugin {
  verifyAttachPossibility(service.router, ActionTransport.http)

  return {
    plugin: {
      name: 'microfleetRouter',
      version: '1.0.0',
      async register(server: Server) {
        for (const [actionName, handler] of Object.entries(service.router.routes.http)) {
          const path = fromNameToPath(actionName, config.prefix)
          const defaultOptions = {
            path,
            handler: hapiRouterAdapter(actionName, service),
            method: ['GET', 'POST'],
          }

          const hapiTransportOptions = get(handler, 'transportOptions.handlers.hapi', Object.create(null))
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
