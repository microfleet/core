import * as assert from 'assert'
import * as sinon from 'sinon'
import { resolve } from 'path'
import { HttpStatusError } from 'common-errors'
import rp from 'request-promise'
import * as restify from 'restify'
import { promisify } from 'util'

import { CoreOptions, Microfleet } from '@microfleet/core'
import { createHmac, createSign, generateKeyPairSync } from 'crypto'
import { ServiceRequest } from '@microfleet/plugin-router'

import { CredentialsStore, SignedRequest, RestifySignedRequestPlugin } from '@microfleet/plugin-signed-request'

declare module 'request-promise' {
  interface RequestPromiseOptions {
    httpSignature?: Record<string, any>
  }
}

const validKeyContents = 'valid-sign-key-contents'
const validKeyId = 'valid-key-id'
const httpSignedRequest = {
  headers: ['digest', '(request-target)', '(algorithm)', '(keyid)']
}
const algorithm = 'hmac-sha512'
const defaultConfig = {
  name: 'signed-service',
  plugins: [
    'validator',
    'logger',
    'router',
    'hapi',
    'router-hapi',
    'signed-request',
  ],
  router: {
    routes: {
      directory: resolve(__dirname, '../artifacts/actions'),
      prefix: 'action',
    },
    auth: {
      strategies: {
        'token-or-signed': async function strategy(this: Microfleet, req: ServiceRequest) {
          if (SignedRequest.isSignedRequest(req.headers)) {
            assert.ok(req.signature, 'signature information should be available')
            assert.deepStrictEqual(await req.signature.getCredentials(), { userId: 'id', extra: 'true' })
          }
        },
      },
    },
  },
  httpSignedRequest,
}

describe('smoke', () => {
  it('should panic on uninitialized request', async () => {
    const signedRequest = new SignedRequest({ headers: [] }, {} as any)
    await assert.rejects(async () => signedRequest.verifyHeaders(), /req should be initialized/)
  })
})

describe('#http-signed-request hapi plugin', () => {
  class MyApp extends Microfleet {
    constructor(opts: Partial<CoreOptions>, credentialsStore: CredentialsStore) {
      super(opts as CoreOptions)
      this.credentialsStore = credentialsStore
    }
  }

  const req = rp.defaults({
    baseUrl: 'http://localhost:3000',
    json: true,
  })

  describe('#hmac', () => {
    let service: Microfleet

    const httpSignature = {
      algorithm,
      keyId: validKeyId,
      key: validKeyContents,
      headers: httpSignedRequest.headers,
    }

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
      service = new MyApp({
        ...defaultConfig,
        validator: {
          schemas: [resolve(__dirname, '../artifacts/schemas')]
        },
      }, stubs)

      await service.connect()
    })

    afterAll(async () => {
      if (service) {
        await service.close()
      }
    })

    it('ignores non signed request', async () => {
      const response = await req.get('action/signed?foo=bar')

      assert.deepStrictEqual(response, { response: 'success' })
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

  describe('#rs', () => {
    let service: Microfleet

    const pemKeypair = generateKeyPairSync('rsa', {
      modulusLength: 1024,
    })
    const privatePemKey = pemKeypair.privateKey.export({ type: 'pkcs8', format: 'pem' })

    const httpSignature = {
      keyId: validKeyId,
      key: privatePemKey,
      headers: httpSignedRequest.headers,
    }

    const stubs: CredentialsStore = {
      getKey: sinon.stub()
        .withArgs().rejects(new HttpStatusError(404, 'key not found'))
        .withArgs(validKeyId).resolves(privatePemKey),
      getCredentials: sinon.stub()
        .withArgs([validKeyId]).resolves({ userId: 'id', extra: 'true' })
    }

    const createDigest = (body?: any) => {
      const signature = createSign('rsa-sha256')
      signature.write(body)

      return signature.sign(pemKeypair.privateKey, 'base64')
    }

    beforeAll(async () => {
      service = new MyApp({
        ...defaultConfig,
        validator: {
          schemas: [resolve(__dirname, '../artifacts/schemas')]
        },
      }, stubs)

      await service.connect()
    })

    afterAll(async () => {
      if (service) {
        await service.close()
      }
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

    it('should panic invalid payload signature #post', async () => {
      const body = { data: { type: 'user' }}

      const promise = req.post('action/signed?foo=bar', {
        headers: {
          digest: `inv${createDigest(JSON.stringify(body))}`,
        },
        httpSignature,
        json: { data: { type: 'user' }},
      })

      await assert.rejects(async () => promise, /invalid payload signature/)
    })
  })
})

describe('restify plugin', () => {
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

  const req = rp.defaults({
    baseUrl: 'http://localhost:8088',
    json: true,
  })


  let server: restify.Server

  beforeAll(async () => {
    server = restify.createServer({ name: 'myapp' })
    server.listen = promisify(server.listen).bind(server)
    server.close = promisify(server.close).bind(server)

    server.use(restify.plugins.acceptParser(server.acceptable))
    server.use(restify.plugins.queryParser())
    server.use(restify.plugins.jsonBodyParser())

    server.use(RestifySignedRequestPlugin(stubs, httpSignedRequest))

    const handler: restify.RequestHandlerType = async function (req, res, next) {
      res.send({
        response: 'success',
        params: req.body,
        credentials: await req.signature?.getCredentials()
      })

      setImmediate(next, false)
    }

    server.get('/action/signed', handler)
    server.post('/action/signed', handler)

    await server.listen(8088)
  })

  afterAll(async () => {
    if (server) {
      await server.close()
    }
  })

  it('ignores non signed request', async () => {
    const response = await req.get('action/signed?foo=bar')

    assert.deepStrictEqual(response, { response: 'success' })
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

  it('should panic on invalid payload signature #post', async () => {
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
