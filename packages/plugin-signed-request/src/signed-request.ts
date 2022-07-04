import { HttpStatusError } from 'common-errors'
import { createHmac, createVerify, Hmac } from 'crypto'
import { IncomingMessage } from 'http'
import { HttpSignature, parseRequest, verifyHMAC, verifySignature } from 'http-signature'

import { Config, CredentialsStore, assertRequestInitialized, RequestInfo } from './types'

const authorizationHeader = 'authorization'

export type { CredentialsStore, Config }

export class SignedRequest {
  private config: Config

  private credStore: CredentialsStore

  private req?: RequestInfo

  constructor(config: Config, credStore: CredentialsStore) {
    this.config = config
    this.credStore = credStore
  }

  async initialize(req: IncomingMessage) {
    const parsedSignature = this.parseHeaders(req)

    const [hash, algorithm] = parsedSignature.algorithm.split('-')
    const signKey = await this.credStore.getKey(parsedSignature.keyId)

    const payloadSignature = hash === 'HMAC'
      ? createHmac(algorithm, signKey)
      : createVerify(algorithm)

    this.req = {
      headers: req.headers,
      hash,
      algorithm,
      signKey,
      parsedSignature,
      payloadSignature,
    }
  }

  private parseHeaders(req: IncomingMessage): HttpSignature {
    const { headers, clockSkew } = this.config
    return parseRequest(req, {
      strict: true,
      headers: headers || [],
      clockSkew,
    })
  }

  verifyHeaders() {
    assertRequestInitialized(this.req)

    const { hash, parsedSignature, signKey } = this.req
    const valid = hash === 'HMAC'
      ? verifyHMAC(parsedSignature, signKey)
      : verifySignature(parsedSignature, signKey)

    if (valid) {
      return
    }

    throw new HttpStatusError(403, 'invalid header signature')
  }

  verifyPayload() {
    assertRequestInitialized(this.req)
    const { headers, payloadSignature, signKey } = this.req

    if (payloadSignature instanceof Hmac) {
      const digest = payloadSignature.digest('base64')

      if (digest !== headers.digest) {
        throw new HttpStatusError(403, 'invalid payload signature')
      }

      return
    }

    if (!payloadSignature.verify(signKey, headers.digest, 'base64')) {
      throw new HttpStatusError(403, 'invalid payload signature')
    }
  }

  appendPayload(chunk: string | Buffer) {
    assertRequestInitialized(this.req)
    this.req.payloadSignature.update(chunk)
  }

  async getCredentials(...args: any[]) {
    assertRequestInitialized(this.req)

    return this.credStore.getCredentials(this.req.parsedSignature.keyId, ...args)
  }

  static isSignedRequest(headers: IncomingMessage['headers']) {
    const authHeader = headers[authorizationHeader]

    if (!authHeader) {
      return false
    }

    const [auth] = authHeader.trim().split(/\s+/, 2).map((str) => str.trim())

    return auth.toLowerCase().startsWith('signature')
  }
}
