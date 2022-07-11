import type * as _ from '../types'
import type { Request, Response, Next } from 'restify'

import { SignedRequest, Config, CredentialsStore } from '../signed-request'

export const RestifySignedRequestPlugin = (store: CredentialsStore, config: Config) => {
  return async function verifySignature(req: Request, _res: Response, next: Next) {

    if (!SignedRequest.isSignedRequest(req.headers)) {
      return setImmediate(next)
    }

    const signature = req.signature = new SignedRequest(config, store)

    try {
      await signature.initialize(req)

      signature.appendPayload(req.rawBody)
      signature.verifyPayload()

      return setImmediate(next)
    } catch(error) {
      return setImmediate(next, error)
    }
  }
}
