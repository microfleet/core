import assert, { rejects, strictEqual } from 'node:assert/strict'
import { Microfleet } from '@microfleet/core'

import { runHandler, runHook } from '../../src/lifecycle/utils'
import { InternalServiceRequest, ServiceRequest } from '@microfleet/plugin-router'

// @todo tests for lifecycle

const dummyRequest = (options?: { response: any }): ServiceRequest => {
  const request = (new InternalServiceRequest({}, {}, null, {})) as ServiceRequest
  if (options && options.response !== undefined) {
    request.response = options.response
  }
  return request
}

describe('@microfleet/plugin-router: "runner" utils', () => {
  const context = new Microfleet({
    name: 'tester',
    logger: {
      defaultLogger: false,
    },
 })

  it('should be able to run', async () => {
    const hooks: any = new Map([
      ['preHandler', new Set([
        async (req: ServiceRequest) => { req.response += 1 },
        async (req: ServiceRequest) => { req.response += 1 },
      ])],
    ])
    const request = dummyRequest({
      response: 0,
    })

    await runHook(hooks, 'preHandler', context, request)

    assert(request.response === 2)
  })

  it('should not throw if run unknown id', async () => {
    const hooks: any = new Map([])
    const request = dummyRequest({
      response: 1,
    })

    await runHook(hooks, 'preHandler', context, request)

    assert(request.response === 1)
  })

  it('should be able to run function', async () => {
    const hooks: any = new Map([
      ['preHandler', new Set([
        async (req: ServiceRequest) => { req.response += 1 },
      ])],
    ])
    const request = dummyRequest({
      response: 0,
    })
    const handler = async (req: any) => { req.response += 1 }

    await runHandler(handler, hooks, 'preHandler', 'postHandler', context, request)

    assert(request.response === 2)
  })

  it('should be able to throw error on pre', async () => {
    const hooks: any = new Map([
      ['preHandler', new Set([
        async (req: ServiceRequest) => { req.error = 'perchik' },
        async (req: ServiceRequest) => { throw new Error(`the name of the fattest cat is ${req.error}`) },
      ])],
    ])
    const request = dummyRequest({
      response: 0,
    })
    const handler = async (req: any) => { req.response += 1 }

    await rejects(
      runHandler(handler, hooks, 'preHandler', 'postHandler', context, request),
      /the fattest cat is perchik/
    )
  })

  it('should return result from handler with "pre-handler"', async () => {
    const hooks: any = new Map([
      ['preHandler', new Set([
        async (req: ServiceRequest) => { req.cat = 'perchik' },
      ])],
    ])
    const request = dummyRequest()
    const handler = async (req: ServiceRequest) => { req.response = req.cat }

    await runHandler(handler, hooks, 'preHandler', 'postHandler', context, request)

    strictEqual(request.cat, 'perchik')
    strictEqual(request.response, 'perchik')
  })

  it('should return result from handler', async () => {
    const hooks: any = new Map()
    const request = dummyRequest()
    const handler = async (req: ServiceRequest) => { req.response = 'perchik' }

    await runHandler(handler, hooks, 'preHandler', 'postHandler', context, request)

    strictEqual(request.response, 'perchik')
  })

  it('should be able to throw error from handler', async () => {
    const hooks: any = new Map()
    const request = dummyRequest()
    const handler = async () => { throw new Error('too fat cat') }

    rejects(
      () => runHandler(handler, hooks, 'preHandler', 'postHandler', context, request),
      /too fat cat/
    )
  })

  it('should be able to error from post-handler', async () => {
    const hooks: any = new Map([
      ['postHandler', new Set([
        async (req: ServiceRequest) => { req.error = 'perchik' },
        async (req: ServiceRequest) => { throw new Error(`the name of the fattest cat is ${req.error}`) },
      ])],
    ])
    const request = dummyRequest({
      response: 0,
    })
    const handler = async (req: ServiceRequest) => { req.response += 1 }

    await rejects(
      runHandler(handler, hooks, 'preHandler', 'postHandler', context, request),
      /the fattest cat is perchik/
    )
  })

  it('should be able to modify result if no error returned from handler', async () => {
    const hooks: any = new Map([
      ['postHandler', new Set([
        async (req: ServiceRequest) => { req.result = 'perchik' },
      ])],
    ])
    const request = dummyRequest()
    const handler = async (req: ServiceRequest) => { req.result = 'persik' }

    await runHandler(handler, hooks, 'preHandler', 'postHandler', context, request)

    strictEqual(request.result, 'perchik')
  })

  it('should be able to modify error returned from handler', async () => {
    const hooks: any = new Map([
      ['postHandler', new Set([
        async (req: ServiceRequest) => { throw new Error(`the name of the fattest cat is ${req.error.message}`) },
      ])],
    ])
    const request = dummyRequest()
    const handler = async () => { throw new Error('perchik') }

    await rejects(
      () => runHandler(handler, hooks, 'preHandler', 'postHandler', context, request),
      /the fattest cat is perchik/
    )
  })

  it('should be able to pass arguments to post-handler', async () => {
    const hooks: any = new Map([
      ['postHandler', new Set([
        async (req: ServiceRequest) => { throw new Error(`the name of the fattest cat is ${req.response}`) },
      ])],
    ])
    const request = dummyRequest()
    const handler = async (req: ServiceRequest) => { req.response = 'perchik' }

    await rejects(
      () => runHandler(handler, hooks, 'preHandler', 'postHandler', context, request),
      /the fattest cat is perchik/
    )
  })
})
