jest.setTimeout(60000)

import { Microfleet } from '@microfleet/core'
import { ConsulConfig } from '@microfleet/plugin-consul'

import * as nock from 'nock'
import { delay } from 'bluebird'
import * as sinon from 'sinon'

let service: Microfleet

afterEach(async () => {
  service.log.debug('closing')
  if (service) await service.close()
  service.log.debug('closed')
})

beforeEach(() => {
  service = createService()
})

const createService = (name = 'consul-test') => {
  return new Microfleet({
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
    logger: {
      defaultLogger: true,
    },
  })
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

  const masterService = createService('as-master')

  // connect master service
  await masterService.connect()
  await expect(masterService.whenLeader()).resolves.toBe(true)

  // worker function should not execute stub
  service.addConnector('application', connectorFn.bind(service))
  await service.connect()
  await masterService.close()
  masterService.log.debug('CLOSED')
  expect(stub.notCalled).toBe(true)
})


test('parallel instances', async () => {
  async function worker(this: Microfleet) {
    const isLeader = await this.whenLeader()
    if (isLeader) {
      if (this.shouldRelease) {
        this.consulLeader.release()
      }
    }
    this.testTimeout = setTimeout(async () => { await worker.call(this) }, 1000)
  }

  async function connectorFn(this: Microfleet) {
    worker.call(this)
    return true
  }

  async function destructorFn(this: Microfleet) {
    clearTimeout(this.testTimeout)
  }

  function assignConnector(srv: Microfleet) {
    srv.addConnector('application', connectorFn.bind(srv), `${srv.config.name}-test-lock`)
    srv.addDestructor('application', destructorFn.bind(srv), `${srv.config.name}-test-lock`)
    return srv
  }

  assignConnector(service)
  let parallelService = createService('second-service')
  assignConnector(parallelService)

  // should switch service when lock released
  service.shouldRelease = true
  await service.connect()
  await expect(service.whenLeader()).resolves.toBe(true)

  // connect second service
  await parallelService.connect()
  await expect(parallelService.whenLeader()).resolves.toBe(true)

  service.shouldRelease = false
  await parallelService.close()
  await expect(service.whenLeader()).resolves.toBe(true)

  // switch master when one service closed
  parallelService = createService('third-service')
  assignConnector(parallelService)

  await parallelService.connect()
  await service.close()

  await expect(parallelService.whenLeader()).resolves.toBe(true)
  await parallelService.close()
})
