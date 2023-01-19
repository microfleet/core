import type * as _ from '../types'
import type { Request } from 'restify'

import { SignedRequest, Config, CredentialsStore } from '../signed-request'

export const RestifySignedRequestPlugin = (store: CredentialsStore, config: Config) => {
  return async function verifySignature(req: Request) {

    if (!SignedRequest.isSignedRequest(req.headers)) {
      return
    }

    const signature = req.signature = new SignedRequest(config, store)
    await signature.initialize(req)

    signature.appendPayload(req.rawBody)
    signature.verifyPayload()
  }
}
