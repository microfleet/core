import type * as _ from '../types'

import { strict } from 'assert'
import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

import { Config, CredentialsStore, SignedRequest } from '../signed-request'

declare module 'fastify' {
  interface FastifyRequest {
    signature?: SignedRequest
  }
}

export const FastifyRequestSignaturePlugin = (store: CredentialsStore, config: Config = {}) => {
  return fp(async function fastifyRequestSignaturePlugin(instance: FastifyInstance) {
    strict(store, 'Credential store is required')

    instance.decorateRequest('signature', null)

    instance.addHook('onRequest', async (req) => {
      if (SignedRequest.isSignedRequest(req.raw.headers)) {
        req.signature = new SignedRequest(config, store)
      }
    })
  
    instance.addHook('preParsing', async (req, _reply, payload) => {
      if (req.signature) {
        const { signature } = req
        await signature.initialize(req.raw)
        signature.verifyHeaders()

        payload.on('data', (chunk: any) => { signature.appendPayload(chunk) })
      }

      return payload
    })

    instance.addHook('preValidation', async (req) => {
      if (req.signature) {
        req.signature.verifyPayload()
      }
    })
  })
}
