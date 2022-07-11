import * as assert from 'assert'
import * as sinon from 'sinon'
import { resolve } from 'path'
import { HttpStatusError } from 'common-errors'
import fetch, { RequestInit } from 'node-fetch'
import * as restify from 'restify'
import { promisify } from 'util'
import { IncomingMessage } from 'http'
import url from 'url'
import { createHmac, createSign, generateKeyPairSync } from 'crypto'
import { sign } from 'http-signature'

import { CoreOptions, Microfleet } from '@microfleet/core'
import { ServiceRequest } from '@microfleet/plugin-router'

import { CredentialsStore, SignedRequest, RestifySignedRequestPlugin } from '@microfleet/plugin-signed-request'

const validKeyContents = 'valid-sign-key-contents'
const validKeyId = 'valid-key-id'
const signedRequest = {
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
  signedRequest,
}

class RequestLike {
  private reqOpts: Record<string, any> = {}
  private _url: url.URL

  constructor(url: string, req: RequestInit & { json?: any }) {
    const { json , ...rest } = req
    const body = json ? JSON.stringify(json) : req.body

    this._url = new URL(url)
    this.reqOpts = {
      headers: {
        'content-type': 'application/json',
      },
      ...rest,
      body,
    }
  }

  get url(): string {
    return this._url.toString()
  }

  get path(): string {
    return `${this._url.pathname}${this._url.search || ''}`
  }

  get method(): string {
    return this.reqOpts.method || 'GET'
  }

  setHeader(h: string, value: unknown) {
    this.reqOpts.headers[h] = value
  }

  getHeader(h: string): unknown {
    return this.reqOpts.headers[h]
  }

  sign(digestfn: any, httpSignature: any) {
    this.setHeader('digest', digestfn(this.reqOpts.body || ''))
    this.setHeader('Date', new Date().toISOString())

    sign(this as any as IncomingMessage, httpSignature)
  }

  getOptions(): RequestInit {
    return this.reqOpts
  }
}

describe('smoke', () => {
  it('should panic on uninitialized request', async () => {
    const signedRequest = new SignedRequest({ headers: [] }, {} as any)
    await assert.rejects(async () => signedRequest.verifyHeaders(), /req should be initialized/)
  })

  it('should panic when CredentialsStore returns empty key', async () => {
    const signedRequest = new SignedRequest({}, {
      // @ts-expect-error broken store
      async getKey() {
        return null
      }
    })

    const promise = signedRequest.initialize({
      headers: {
        date: new Date().toISOString(),
        digest: 'some',
        authorization: `Signature keyId="foo",algorithm="hmac-sha512",headers="digest (request-target) (algorithm) (keyid)",signature="sig"`
      },
      method: 'GET',
      url: 'foo.bar/baz',
    } as any)

    await assert.rejects(promise, /sign key is required/)
  })
})

describe('#http-signed-request hapi plugin', () => {
  class MyApp extends Microfleet {
    constructor(opts: Partial<CoreOptions>, credentialsStore: CredentialsStore) {
      super(opts as CoreOptions)
      this.credentialsStore = credentialsStore
    }
  }

  const baseUrl = `http://localhost:3000/`

  describe('#hmac', () => {
    let service: Microfleet

    const httpSignature = {
      algorithm,
      keyId: validKeyId,
      key: validKeyContents,
      headers: signedRequest.headers,
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

    const signRequest = (url: string, req: RequestInit & { json?: any }) => {
      const reqLike = new RequestLike(`${baseUrl}${url}`, req)
      reqLike.sign(createDigest, httpSignature)
      return reqLike
    }

    const signAndRequest = async (url: string, req: RequestInit & { json?: any }) => {
      const signed = signRequest(url, req)
      const request = await fetch(signed.url, signed.getOptions())
      return request.json()
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

    it('ignores non signed request', async () => {
      const req = await fetch(`${baseUrl}action/signed?foo=bar`, {
        method: 'GET',
      })
      const response = await req.json()

      assert.deepStrictEqual(response, { response: 'success' })
    })

    it('should verify #get', async () => {
      const response = await signAndRequest('action/signed?foo=bar', {
        method: 'GET',
      })

      assert.deepStrictEqual(response, { response: 'success', credentials: { userId: 'id', extra: 'true' } })
    })

    it('should verify #post', async () => {
      const body = { data: { type: 'user' }}

      const response = await signAndRequest('action/signed?foo=bar',{
        method: 'post',
        json: body
      })

      assert.deepStrictEqual(response, {
        response: 'success',
        credentials: { userId: 'id', extra: 'true' },
        params: { data: { type: 'user'} }
      })
    })

    it('should panic on invalid header signature', async () => {
      const signed = signRequest('action/signed?foo=bar', {
        method: 'post',
        json: { data: { type: 'user' }},
      })

      signed.setHeader('digest', 'invalid')

      const patched = await fetch(signed.url, signed.getOptions())
      const body: any = await patched.json()

      assert.deepStrictEqual(patched.status, 403)
      assert.deepStrictEqual(body.message, 'invalid header signature')
    })

    it('should panic on invalid payload signature', async () => {
      const signed = signRequest('action/signed?foo=bar', {
        method: 'post',
        json: { data: { type: 'user' }},
      })
      const opts = signed.getOptions()
      opts.body = '{}'

      const patched = await fetch(signed.url, signed.getOptions())
      const body: any = await patched.json()

      assert.deepStrictEqual(patched.status, 403)
      assert.deepStrictEqual(body.message, 'invalid payload signature')
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
      headers: signedRequest.headers,
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

    const signRequest = (url: string, req: RequestInit & { json?: any }) => {
      const reqLike = new RequestLike(`${baseUrl}${url}`, req)
      reqLike.sign(createDigest, httpSignature)
      return reqLike
    }

    const signAndRequest = async (url: string, req: RequestInit & { json?: any }) => {
      const signed = signRequest(url, req)
      const request = await fetch(signed.url, signed.getOptions())
      return request.json()
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

      const response = await signAndRequest('action/signed?foo=bar', { method: 'post', json: body })

      assert.deepStrictEqual(response, {
        response: 'success',
        credentials: { userId: 'id', extra: 'true' },
        params: { data: { type: 'user'} }
      })
    })

    it('should panic invalid payload signature #post', async () => {
      const signed = signRequest('action/signed?foo=bar', { method: 'post', json: { data: { type: 'user' }} })
      const opts = signed.getOptions()
      opts.body = '{}'

      const patched = await fetch(signed.url, signed.getOptions())
      const body: any = await patched.json()

      assert.deepStrictEqual(patched.status, 403)
      assert.deepStrictEqual(body.message, 'invalid payload signature')
    })
  })
})

describe('restify plugin', () => {
  const validKeyContents = 'valid-sign-key-contents'
  const validKeyId = 'valid-key-id'
  const algorithm = 'hmac-sha512'
  const httpSignature = {
    algorithm,
    keyId: validKeyId,
    key: validKeyContents,
    headers: signedRequest.headers,
  }
  const baseUrl = 'http://localhost:8088/'

  const stubs: CredentialsStore = {
    getKey: sinon.stub()
      .withArgs().rejects(new HttpStatusError(404, 'key not found'))
      .withArgs(validKeyId).resolves(validKeyContents),
    getCredentials: sinon.stub()
      .withArgs([validKeyId]).resolves({ userId: 'id', extra: 'true' })
  }

  const createDigest = (body?: any) => createHmac('sha512', validKeyContents)
    .update(body || '')
    .digest('base64')

  const signRequest = (url: string, req: RequestInit & { json?: any }) => {
    const reqLike = new RequestLike(`${baseUrl}${url}`, req)
    reqLike.sign(createDigest, httpSignature)
    return reqLike
  }

  const signAndRequest = async (url: string, req: RequestInit & { json?: any }) => {
    const signed = signRequest(url, req)
    const request = await fetch(signed.url, {
      ...signed.getOptions(),
      headers: {
        ...signed.getOptions().headers,
        'content-type': 'application/json'
      }
    })

    return request.json()
  }

  let server: restify.Server

  beforeAll(async () => {
    server = restify.createServer({ name: 'myapp' })
    server.listen = promisify(server.listen).bind(server)
    server.close = promisify(server.close).bind(server)

    server.use(restify.plugins.acceptParser(server.acceptable))
    server.use(restify.plugins.queryParser())
    server.use(restify.plugins.jsonBodyParser())

    server.use(RestifySignedRequestPlugin(stubs, signedRequest))

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
    const req = await fetch(`${baseUrl}action/signed?foo=bar`, { method: 'get' })
    const response = await req.json()
    assert.deepStrictEqual(response, { response: 'success' })
  })

  it('should verify #post', async () => {
    const response = await signAndRequest('action/signed?foo=bar', {
      method: 'post',
      json: { data: { type: 'user' }},
    })

    assert.deepStrictEqual(response, {
      response: 'success',
      credentials: { userId: 'id', extra: 'true' },
      params: { data: { type: 'user'} }
    })
  })

  it('should panic on invalid payload signature #post', async () => {
    const signed = signRequest('action/signed?foo=bar', { method: 'post', json: { data: { type: 'user' }} })
    const opts = signed.getOptions()
    opts.body = '{}'

    const patched = await fetch(signed.url, {
      ...signed.getOptions(),
      headers: {
        ...signed.getOptions().headers,
        'content-type': 'application/json'
      }
    })
    const body: any = await patched.json()

    assert.deepStrictEqual(patched.status, 403)
    assert.deepStrictEqual(body.message, 'invalid payload signature')
  })
})
