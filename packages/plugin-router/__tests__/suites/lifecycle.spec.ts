import { strict as assert } from 'assert'

// import Lifecycle from '../../src/lifecycle'
import Runner from '../../src/lifecycle/runner'

// describe('@microfleet/plugin-router: lifecycle', () => {
//   it('should be able to register an extension', async () => {

//   })
// })

describe('@microfleet/plugin-router: lifecycle/runner', () => {
  it('shoul be able to run functions', async () => {
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

    runner.runFn('handler', async (req) => { req.response += 1 }, request, 1)

    assert(request.response === 2)
  })

  it('should be able to run function with adds', async () => {
    const runner = new Runner()
    const request = {
      response: 0,
      error: undefined,
    }

    runner.register('preHandler', async (req) => { req.response += 1 })

    runner.runFn(
      'handler',
      async (req, param1, param2) => { req.response += (param1 + param2) },
      request,
      2,
      3,
    )

    assert(request.response === 6)
  })
})
