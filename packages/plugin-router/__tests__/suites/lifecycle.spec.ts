import { strict as assert, rejects, strictEqual } from 'assert'

// import Lifecycle from '../../src/lifecycle'
import Runner from '../../src/lifecycle/runner'

// describe('@microfleet/plugin-router: lifecycle', () => {
//   it('should be able to register an extension', async () => {

//   })
// })

describe('@microfleet/plugin-router: lifecycle/runner', () => {
  it('shoul be able to run', async () => {
    const runner = new Runner()
    const request = {
      response: 0,
      error: undefined,
    }

    runner.register('preHandler', async (req) => { req.response += 1 })
    runner.register('preHandler', async (req) => { req.response += 1 })

    await runner.run('preHandler', request)

    assert(request.response === 2)
  })

  it('should not throw if run unknown id', async () => {
    const runner = new Runner()
    const request = {
      response: 1,
      error: undefined,
    } as const

    await runner.run('preUndefined', request)

    assert(request.response === 1)
  })

  it('should be able to run function', async () => {
    const runner = new Runner()
    const request = {
      response: 0,
      error: undefined,
    }

    runner.register('preHandler', async (req) => { req.response += 1 })

    await runner.runFn('handler', async (req) => { req.response += 1 }, request, 1)

    assert(request.response === 2)
  })

  it('should be able to run function with adds', async () => {
    const runner = new Runner()
    const request = {
      response: 0,
      error: undefined,
    }

    runner.register('preHandler', async (req) => { req.response += 1 })

    await runner.runFn(
      'handler',
      async (req, param1, param2) => { req.response += (param1 + param2) },
      request,
      2,
      3,
    )

    assert(request.response === 6)
  })

  it('should be able to throw error on pre', async () => {
    const runner = new Runner()

    runner.register('preHandler', async (req: any) => { req.error = 'perchik' })
    runner.register(
      'preHandler',
      async (req: any) => { throw new Error(`the name of the fattest cat is ${req.error}`) }
    )

    await rejects(() => runner.runFn('handler', async () => {}, {}), /the fattest cat is perchik/)
  })

  it('should return result from handler with "pre-handler"', async () => {
    const runner = new Runner()
    const request: any = {}

    runner.register('preHandler', async (req: any) => { req.cat = 'perchik' })

    await runner.runFn('handler', async (req: any) => { req.response = req.cat }, request)

    strictEqual(request.cat, 'perchik')
    strictEqual(request.response, 'perchik')
  })

  it('should return result from handler', async () => {
    const runner = new Runner()
    const request: any = {}

    await runner.runFn('handler', async (req: any) => { req.response = 'perchik' }, request)

    strictEqual(request.response, 'perchik')
  })

  it('should be able to throw error from handler', async () => {
    const runner = new Runner()

    rejects(
      () => runner.runFn('handler', async () => { throw new Error('too fat cat') }, {}),
      /too fat cat/
    )
  })

  it('should be able to error from post-handler', async () => {
    const runner = new Runner()

    runner.register('postHandler', async (req: any) => { req.error = 'perchik' })
    runner.register(
      'postHandler',
      async (req: any) => { throw new Error(`the name of the fattest cat is ${req.error}`) }
    )

    await rejects(() => runner.runFn('handler', async () => {}, {}), /the fattest cat is perchik/)
  })

  it('should be able to modify result if no error returned from handler', async () => {
    const runner = new Runner()
    const request: any = {}

    runner.register('postHandler', async (req: any) => { req.result = 'perchik' })

    await runner.runFn('handler', async (req: any) => { req.result = 'persik' }, request)

    strictEqual(request.result, 'perchik')
  })

  it('should be able to modify error returned from handler', async () => {
    const runner = new Runner()

    runner.register(
      'postHandler',
      async (req: any) => { throw new Error(`the name of the fattest cat is ${req.error.message}`) }
    )

    await rejects(
      () => runner.runFn('handler', async () => { throw new Error('perchik') }, {}),
      /the fattest cat is perchik/
    )
  })

  it('should be able to pass arguments to post-handler', async () => {
    const runner = new Runner()

    runner.register(
      'postHandler',
      async (req: any) => { throw new Error(`the name of the fattest cat is ${req.response}`) }
    )

    await rejects(
      () => runner.runFn('handler', async (req: any) => { req.response = 'perchik' }, {}),
      /the fattest cat is perchik/
    )
  })
})
