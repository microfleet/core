import type * as _ from '../types'
import type { Server } from '@hapi/hapi'

import { boomify } from '@hapi/boom'
import { SignedRequest, CredentialsStore, Config } from '../signed-request'

export const HapiSignedRequestPlugin = (store: CredentialsStore, config: Config) => ({
  name: 'hapi-signed-request',
  register(server: Server) {
    server.ext('onRequest', async (request, h) => {
      if (SignedRequest.isSignedRequest(request.headers)) {
        try {
          const signature = request.plugins.signature = new SignedRequest(config, store)
          await signature.initialize(request.raw.req)

          signature.verifyHeaders()

          request.events.on('peek', (chunk) => {
            signature.appendPayload(chunk)
          })

        } catch (e: any) {
          throw boomify(e, { statusCode: e.statusCode || e.status_code })
        }
      }

      return h.continue
    })

    server.ext('onPreHandler', (request, h) => {
      if (request.plugins.signature) {
        try {
          request.plugins.signature.verifyPayload()
        } catch (e: any) {
          throw boomify(e, { statusCode: e.statusCode || e.status_code })
        }
      }

      return h.continue
    })
  },
})
