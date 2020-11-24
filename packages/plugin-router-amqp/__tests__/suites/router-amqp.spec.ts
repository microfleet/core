import * as assert from 'assert'
import { resolve } from 'path'
import { ConnectionError } from 'common-errors'
import { Microfleet } from '@microfleet/core'
import { Lifecycle, ServiceRequest } from '@microfleet/plugin-router'

jest.setTimeout(15000)

const failedActionEmulator = [{
  point: Lifecycle.points.preHandler,
  async handler(request: ServiceRequest) {
    const { failAtRetryCount } = request.params
    const { headers } = request.headers
    const retryCount = headers['x-retry-count'] || 0

    if (retryCount <= failAtRetryCount) {
      throw new ConnectionError('Fake connection error first three times')
    }

    return [request]
  },
}]

describe('AMQP suite: basic routing', function testSuite() {
  const service = new Microfleet({
    name: 'tester',
    plugins: [
      'logger', // essensial plugin
      'validator', // essensial plugin
      'amqp', // init amqp
      'router', // enable router
      'router-amqp' // attach amqp transport to router
    ],
    router: {
      routes: {
        directory: resolve(__dirname, '../artifacts/actions'),
      },
    },
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it('able to observe an action', async () => {
    const amqpRoutes = service.router.routes.get('amqp')

    assert.ok(typeof amqpRoutes.get('echo') === 'function')
  })

  it('able to dispatch action and return response', async () => {
    const { amqp } = service

    const response = await amqp.publishAndWait('echo', { foo: 'bar' })

    assert.deepStrictEqual(response, { foo: 'bar' })
  })
})

describe('AMQP suite: prefixed routing', function testSuite() {
  const service = new Microfleet({
    name: 'tester',
    plugins: [
      'logger', // essensial plugin
      'validator', // essensial plugin
      'amqp', // init amqp
      'router', // enable router
      'router-amqp' // attach amqp transport to router
    ],
    router: {
      routes: {
        directory: resolve(__dirname, '../artifacts/actions'),
      },
    },
    'router-amqp': {
      prefix: 'amqp-prefix',
    }
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it ('able to observe an action', async () => {
    const amqpRoutes = service.router.routes.get('amqp')

    assert.ok(typeof amqpRoutes.get('echo') === 'function')
  })

  it ('able to dispatch action and return response', async () => {
    const { amqp } = service

    const response = await amqp.publishAndWait('amqp-prefix.echo', { foo: 'bar' })

    assert.deepStrictEqual(response, { foo: 'bar' })
  })
})

describe('AMQP suite: retry + amqp router prefix', function testSuite() {
  const service = new Microfleet({
    name: 'tester',
    plugins: [
      'logger', // essensial plugin
      'validator', // essensial plugin
      'amqp', // init amqp
      'router', // enable router
      'router-amqp' // attach amqp transport to router
    ],
    amqp: {
      transport: {
        // @todo should have a default value?
        queue: 'test-queue',
        bindPersistantQueueToHeadersExchange: true,
        neck: 10,
      },
    },
    router: {
      extensions: {
        register: [failedActionEmulator]
      },
      routes: {
        directory: resolve(__dirname, '../artifacts/actions'),
      },
    },
    'router-amqp': {
      prefix: 'amqp-prefix',
      retry: {
        enabled: true,
        maxRetries: 3, // 3 attempts only
        predicate: (_: any, actionName: string) => actionName !== 'echo',
      },
    },
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it('able to successfully retry action dispatch', async () => {
    const { amqp } = service

    const response = await amqp.publishAndWait('amqp-prefix.echo', { failAtRetryCount: 2 })

    assert.deepStrictEqual(response, { failAtRetryCount: 2 })
  })

  it ('able to fail when retry count exceeds max retry attempt count', async () => {
    const { amqp } = service

    await assert.rejects(
      amqp.publishAndWait('amqp-prefix.echo', { failAtRetryCount: 3 }),
      {
        message: 'Fake connection error first three times',
        name: 'ConnectionError',
        generateMessage: null,
        global_initialize: undefined,
        inner_error: undefined,
        isOperational: true,
        retryAttempt: 3
      }
    )
  })
})

describe('AMQP suite: retry + amqp router prefix + router prefix', function testSuite() {
  const service = new Microfleet({
    name: 'tester',
    plugins: [
      'logger', // essensial plugin
      'validator', // essensial plugin
      'amqp', // init amqp
      'router', // enable router
      'router-amqp' // attach amqp transport to router
    ],
    amqp: {
      transport: {
        // @todo should have a default value?
        queue: 'test-queue-2',
        bindPersistantQueueToHeadersExchange: true,
        neck: 10,
      },
    },
    router: {
      extensions: {
        register: [failedActionEmulator]
      },
      routes: {
        prefix: 'router-prefix',
        directory: resolve(__dirname, '../artifacts/actions'),
      },
    },
    'router-amqp': {
      prefix: 'amqp-prefix',
      retry: {
        enabled: true,
        maxRetries: 3, // 3 attempts only
        predicate: (_: any, actionName: string) => actionName !== 'router-prefix.echo',
      },
    },
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it ('able to successfully retry action dispatch', async () => {
    const { amqp } = service

    const response = await amqp.publishAndWait('amqp-prefix.router-prefix.echo', { failAtRetryCount: 2 })

    assert.deepStrictEqual(response, { failAtRetryCount: 2 })
  })

  it ('able to fail when retry count exceeds max retry attempt count', async () => {
    const { amqp } = service

    await assert.rejects(
      amqp.publishAndWait('amqp-prefix.router-prefix.echo', { failAtRetryCount: 3 }),
      {
        message: 'Fake connection error first three times',
        name: 'ConnectionError',
        generateMessage: null,
        global_initialize: undefined,
        inner_error: undefined,
        isOperational: true,
        retryAttempt: 3
      }
    )
  })
})
