import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout } from 'node:timers/promises'
import { Microfleet } from '@microfleet/core'
import { ConsulConfig } from '@microfleet/plugin-consul'
import nock from 'nock'
import sinon from 'sinon'

let service: Microfleet

test('consul tests', async (t) => {
  t.beforeEach(async () => {
    service = await createService()
  })

  t.afterEach(async () => {
    if (service) await service.close()
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
        }
      } as Partial<ConsulConfig>,
    })
    await service.register()
    return service
  }

  await t.test('service launched', async () => {
    assert.ok(service.consul)
    await service.connect()
    const isLeader = await service.whenLeader()
    assert.equal(isLeader, true)
  })

  await t.test('connection error', async () => {
    await service.connect()
    const isLeader = await service.whenLeader()
    assert.equal(isLeader, true)

    const stub = sinon.stub()
    service.on('consul.lock.error', stub)

    nock.disableNetConnect()
    await setTimeout(5000)
    nock.enableNetConnect()

    assert.equal(stub.called, true)

    const newLeader = await service.whenLeader()
    assert.equal(newLeader, true)
  })

  await t.test('parallel instances - whenLeader resolves to false when closing', async () => {
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

    await masterService.connect()
    const isLeader = await masterService.whenLeader()
    assert.equal(isLeader, true)

    service.addConnector('application', connectorFn.bind(service))
    await service.connect()
    await masterService.close()

    assert.equal(stub.notCalled, true)
  })

  await t.test('parallel instances', async () => {
    async function worker(ctx: Microfleet) {
      const isLeader = await ctx.whenLeader()
      if (isLeader) {
        if (ctx.shouldRelease) {
          ctx.consulLeader.release()
          ctx.log.info('--------------------- releasing lock')
        }
      }
      ctx.testTimeout = global.setTimeout(worker, 100, ctx)
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

    service.shouldRelease = false
    await service.connect()
    let isLeader = await service.whenLeader()
    assert.equal(isLeader, true)

    service.shouldRelease = true
    await parallelService.connect()
    isLeader = await parallelService.whenLeader()
    assert.equal(isLeader, true)

    service.shouldRelease = false
    await parallelService.close()
    isLeader = await service.whenLeader()
    assert.equal(isLeader, true)

    parallelService = await createService('third-service')
    assignConnector(parallelService)

    await parallelService.connect()
    await service.close()

    isLeader = await parallelService.whenLeader()
    assert.equal(isLeader, true)
    await parallelService.close()
  })
})
