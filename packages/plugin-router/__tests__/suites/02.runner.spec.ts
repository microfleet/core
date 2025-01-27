import { describe, it } from 'node:test'
import assert, { rejects, strictEqual } from 'node:assert/strict'
import { Microfleet } from '@microfleet/core'

import { runHandler, runHook } from '../../src/lifecycle/utils'

// @todo tests for lifecycle

describe('@microfleet/plugin-router: "runner" utils', async () => {
  const context = new Microfleet({
    name: 'tester',
    logger: {
      defaultLogger: false,
    },
  })

  it('should be able to run', async () => {
    const hooks: any = new Map([
      ['preHandler', new Set([
        async (req: any) => { req.response += 1 },
        async (req: any) => { req.response += 1 },
      ])],
    ])
    const request = {
      response: 0,
    } as any

    await runHook(hooks, 'preHandler', context, request)

    assert(request.response === 2)
  })

  it('should not throw if run unknown id', async () => {
    const hooks: any = new Map([])
    const request = {
      response: 1,
    } as any

    await runHook(hooks, 'preHandler', context, request)

    assert(request.response === 1)
  })

  it('should be able to run function', async () => {
    const hooks: any = new Map([
      ['preHandler', new Set([
        async (req: any) => { req.response += 1 },
      ])],
    ])
    const request = {
      response: 0,
    } as any
    const handler = async (req: any) => { req.response += 1 }

    await runHandler(handler, hooks, 'preHandler', 'postHandler', context, request)

    assert(request.response === 2)
  })

  it('should be able to throw error on pre', async () => {
    const hooks: any = new Map([
      ['preHandler', new Set([
        async (req: any) => { req.error = 'perchik' },
        async (req: any) => { throw new Error(`the name of the fattest cat is ${req.error}`) },
      ])],
    ])
    const request = {
      response: 0,
    } as any
    const handler = async (req: any) => { req.response += 1 }

    await rejects(
      runHandler(handler, hooks, 'preHandler', 'postHandler', context, request),
      /the fattest cat is perchik/
    )
  })

  it('should return result from handler with "pre-handler"', async () => {
    const hooks: any = new Map([
      ['preHandler', new Set([
        async (req: any) => { req.cat = 'perchik' },
      ])],
    ])
    const request = {} as any
    const handler = async (req: any) => { req.response = req.cat }

    await runHandler(handler, hooks, 'preHandler', 'postHandler', context, request)

    strictEqual(request.cat, 'perchik')
    strictEqual(request.response, 'perchik')
  })

  it('should return result from handler', async () => {
    const hooks: any = new Map()
    const request = {} as any
    const handler = async (req: any) => { req.response = 'perchik' }

    await runHandler(handler, hooks, 'preHandler', 'postHandler', context, request)

    strictEqual(request.response, 'perchik')
  })

  it('should be able to throw error from handler', async () => {
    const hooks: any = new Map()
    const request = {} as any
    const handler = async () => { throw new Error('too fat cat') }

    rejects(
      () => runHandler(handler, hooks, 'preHandler', 'postHandler', context, request),
      /too fat cat/
    )
  })

  it('should be able to error from post-handler', async () => {
    const hooks: any = new Map([
      ['postHandler', new Set([
        async (req: any) => { req.error = 'perchik' },
        async (req: any) => { throw new Error(`the name of the fattest cat is ${req.error}`) },
      ])],
    ])
    const request = {
      response: 0,
    } as any
    const handler = async (req: any) => { req.response += 1 }

    await rejects(
      runHandler(handler, hooks, 'preHandler', 'postHandler', context, request),
      /the fattest cat is perchik/
    )
  })

  it('should be able to modify result if no error returned from handler', async () => {
    const hooks: any = new Map([
      ['postHandler', new Set([
        async (req: any) => { req.result = 'perchik' },
      ])],
    ])
    const request = {} as any
    const handler = async (req: any) => { req.result = 'persik' }

    await runHandler(handler, hooks, 'preHandler', 'postHandler', context, request)

    strictEqual(request.result, 'perchik')
  })

  it('should be able to modify error returned from handler', async () => {
    const hooks: any = new Map([
      ['postHandler', new Set([
        async (req: any) => { throw new Error(`the name of the fattest cat is ${req.error.message}`) },
      ])],
    ])
    const request = {} as any
    const handler = async () => { throw new Error('perchik') }

    await rejects(
      () => runHandler(handler, hooks, 'preHandler', 'postHandler', context, request),
      /the fattest cat is perchik/
    )
  })

  it('should be able to pass arguments to post-handler', async () => {
    const hooks: any = new Map([
      ['postHandler', new Set([
        async (req: any) => { throw new Error(`the name of the fattest cat is ${req.response}`) },
      ])],
    ])
    const request = {} as any
    const handler = async (req: any) => { req.response = 'perchik' }

    await rejects(
      () => runHandler(handler, hooks, 'preHandler', 'postHandler', context, request),
      /the fattest cat is perchik/
    )
  })
})
