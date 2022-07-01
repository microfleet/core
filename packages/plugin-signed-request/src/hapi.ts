import type { Server } from '@microfleet/plugin-hapi'
import { boomify } from '@hapi/boom'

import { SignedRequest, CredentialsStore, Config } from './signed-request'

declare module '@hapi/hapi' {
  export interface PluginsStates {
    signedRequest?: SignedRequest,
  }
}

export const HapiSignedRequestPlugin = (store: CredentialsStore, config: Config) => ({
  name: 'hapi-signed-request',
  register(server: Server) {
    server.ext('onRequest', async (request, h) => {
      if (SignedRequest.isSignedRequest(request.headers)) {
        try {
          const signedRequest = request.plugins.signedRequest = new SignedRequest(config, store)
          await signedRequest.initialize(request.raw.req)

          signedRequest.verifyHeaders()

          request.events.on('peek', (chunk) => {
            signedRequest.appendPayload(chunk)
          })

        } catch (e: any) {
          throw boomify(e, { statusCode: e.statusCode })
        }
      }

      return h.continue
    })

    server.ext('onPreHandler', (request, h) => {
      if (request.plugins.signedRequest) {
        try {
          request.plugins.signedRequest.verifyPayload()
        } catch (e: any) {
          throw boomify(e, { statusCode: e.statusCode })
        }
      }

      return h.continue
    })
  },
})
