jest.setTimeout(60000)

import { Microfleet } from '@microfleet/core'
import { ConsulConfig } from '@microfleet/plugin-consul'

import nock from 'nock'
import { delay } from 'bluebird'
import sinon from 'sinon'

let service: Microfleet

afterEach(async () => {
  if (service) await service.close()
})

beforeEach(async () => {
  service = await createService()
})

const createService = async (name = 'consul-test') => {
  const service = new Microfleet({
    name,
    plugins: ['validator', 'logger', 'consul'],
    consul: {
      base: {
        host: 'consul',
      },
      lock: {
        lockretrytime: '1s',
        lockwaittime: '1s',
        key: 'leader/test/key',
        session: {
          ttl: '10s',
        }
      },
    } as Partial<ConsulConfig>,
  })
  await service.register()
  return service
}

test('service launched', async () => {
  expect.assertions(2)

  expect(service.consul).toBeDefined()
  await service.connect()
  await expect(service.whenLeader()).resolves.toBe(true)
})

test('connection error', async () => {
  await service.connect()
  await expect(service.whenLeader()).resolves.toBe(true)

  const stub = sinon.stub()
  service.on('consul.lock.error', stub)

  nock.disableNetConnect()
  await delay(5000) // average timeout until consul.lock throws error
  nock.enableNetConnect()

  expect(stub.called).toBe(true)

  // try to get lock again
  await expect(service.whenLeader()).resolves.toBe(true)
})


test('parallel instances - whenLeader resolves to false when closing', async () => {
  const stub = sinon.stub()

  async function worker(this: Microfleet) {
    const isLeader = await this.whenLeader()
    this.log.debug({ isLeader }, 'RESOLVED')
    if (isLeader) {
      stub()
    }
  }

  async function connectorFn(this: Microfleet) {
    worker.call(this)
    return true
  }

  const masterService = await createService('as-master')

  // connect master service
  await masterService.connect()
  await expect(masterService.whenLeader()).resolves.toBe(true)

  // worker function should not execute stub
  service.addConnector('application', connectorFn.bind(service))
  await service.connect()
  await masterService.close()

  expect(stub.notCalled).toBe(true)
})


test('parallel instances', async () => {
  async function worker(ctx: Microfleet) {
    const isLeader = await ctx.whenLeader()
    if (isLeader) {
      if (ctx.shouldRelease) {
        ctx.consulLeader.release()
        ctx.log.info('--------------------- releasing lock')
      }
    }
    ctx.testTimeout = setTimeout(worker, 100, ctx)
  }

  async function connectorFn(this: Microfleet) {
    worker(this)
    return true
  }

  async function destructorFn(this: Microfleet) {
    clearTimeout(this.testTimeout)
  }

  function assignConnector(srv: Microfleet) {
    srv.addConnector('application', connectorFn, `${srv.config.name}-test-lock`)
    srv.addDestructor('application', destructorFn, `${srv.config.name}-test-lock`)
    return srv
  }

  assignConnector(service)
  let parallelService = await createService('second-service')
  assignConnector(parallelService)

  // should switch service when lock released
  service.shouldRelease = false
  await service.connect()
  await expect(service.whenLeader()).resolves.toBe(true)

  // // connect second service
  service.shouldRelease = true
  await parallelService.connect()
  await expect(parallelService.whenLeader()).resolves.toBe(true)

  service.shouldRelease = false
  await parallelService.close()
  await expect(service.whenLeader()).resolves.toBe(true)

  // // switch master when one service closed
  parallelService = await createService('third-service')
  assignConnector(parallelService)

  await parallelService.connect()
  await service.close()

  await expect(parallelService.whenLeader()).resolves.toBe(true)
  await parallelService.close()
})
