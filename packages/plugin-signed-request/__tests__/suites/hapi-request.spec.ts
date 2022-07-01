import * as assert from 'assert'
import * as sinon from 'sinon'
import { resolve } from 'path'
import { HttpStatusError } from 'common-errors'
import rp from 'request-promise'

import { CoreOptions, Microfleet } from '@microfleet/core'
import { CredentialsStore } from '@microfleet/plugin-signed-request'
import { createHmac } from 'crypto'
import { ServiceRequest } from '@microfleet/plugin-router'

declare module 'request-promise' {
  interface RequestPromiseOptions {
    httpSignature?: Record<string, any>
  }
}

class MyApp extends Microfleet {
  constructor(opts: Partial<CoreOptions>, credentialsStore: CredentialsStore) {
    super(opts as CoreOptions)
    this.credentialsStore = credentialsStore
  }
}

const validKeyContents = 'valid-sign-key-contents'
const validKeyId = 'valid-key-id'
const httpSignedRequest = {
  headers: ['digest', '(request-target)', '(algorithm)', '(keyid)']
}
const algorithm = 'hmac-sha512'
const httpSignature = {
  algorithm,
  keyId: validKeyId,
  key: validKeyContents,
  headers: httpSignedRequest.headers,
}

const req = rp.defaults({
  baseUrl: 'http://localhost:3000',
  json: true,
})

const defaultConfig = {
  name: 'signed-service',
  plugins: [
    'validator',
    'logger',
    'router',
    'hapi',
    'router-hapi',
    'http-signed-request',
  ],
  validator: {
    schemas: [resolve(__dirname, '../artifacts/schemas')]
  },
  router: {
    routes: {
      directory: resolve(__dirname, '../artifacts/actions'),
      prefix: 'action',
    },
    auth: {
      strategies: {
        'token-or-signed': async function strategy(this: Microfleet, req: ServiceRequest) {
          assert.ok(req.signedRequest, 'signature information should be available')
          assert.deepStrictEqual(await req.signedRequest.getCredentials(), { userId: 'id', extra: 'true' })
        },
      },
    },
  },
  httpSignedRequest,
}

describe('#http-signed-request hapi plugin', () => {
  let service: Microfleet

  describe('#hmac', () => {
    const stubs: CredentialsStore = {
      getKey: sinon.stub()
        .withArgs().rejects(new HttpStatusError(404, 'key not found'))
        .withArgs(validKeyId).resolves(validKeyContents),
      getCredentials: sinon.stub()
        .withArgs([validKeyId]).resolves({ userId: 'id', extra: 'true' })
    }

    const createDigest = (body?: any) => createHmac('sha512', validKeyContents)
    .update(body)
    .digest('base64')


    beforeAll(async () => {
      service = new MyApp(defaultConfig, stubs)

      await service.connect()
    })

    afterAll(async () => {
      if (service) {
        await service.close()
      }
    })

    it('should verify #get', async () => {
      const response = await req.get('action/signed?foo=bar', {
        headers: {
          digest: createDigest('')
        },
        httpSignature,
      })

      assert.deepStrictEqual(response, { response: 'success', credentials: { userId: 'id', extra: 'true' } })
    })

    it('should verify #post', async () => {
      const body = { data: { type: 'user' }}

      const response = await req.post('action/signed?foo=bar', {
        headers: {
          digest: createDigest(JSON.stringify(body))
        },
        json: body,
        httpSignature,
      })

      assert.deepStrictEqual(response, {
        response: 'success',
        credentials: { userId: 'id', extra: 'true' },
        params: { data: { type: 'user'} }
      })
    })

    it('should panic on invalid header signature', async () => {
      const body = { data: { type: 'user' }}

      const signed = req.post('action/signed?foo=bar', {
        headers: {
          digest: `${createDigest(JSON.stringify(body))}`,
        },
        httpSignature,
        json: { data: { type: 'user' }},
      })

      const patched = req.post('action/signed?foo=bar', {
        headers: {
          ...signed.headers,
          digest: 'invalid'
        },
        json: { data: { type: 'user' }},
      })

      await assert.rejects(async () => patched, /invalid header signature/)
    })

    it('should panic on invalid payload signature', async () => {
      const body = { data: { type: 'user' }}

      const promise = req.post('action/signed?foo=bar', {
        headers: {
          digest: `${createDigest(JSON.stringify(body))}inv`,
        },
        httpSignature,
        json: { data: { type: 'user' }},
      })

      await assert.rejects(async () => promise, /invalid payload signature/)
    })
  })
})
