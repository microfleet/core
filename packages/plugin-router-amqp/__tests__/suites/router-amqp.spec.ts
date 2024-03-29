import { strict as assert, deepStrictEqual, rejects } from 'assert'
import { resolve } from 'path'
import { ConnectionError } from 'common-errors'
import { Microfleet } from '@microfleet/core'
import { Lifecycle, ServiceRequest } from '@microfleet/plugin-router'
import { spy } from 'sinon'
import { RequestCountTracker } from '@microfleet/plugin-router'
import { AMQPTransport, connect } from '@microfleet/transport-amqp'

jest.setTimeout(5000)

const failedActionEmulator = [{
  point: Lifecycle.hooks.preHandler,
  async handler(request: ServiceRequest) {
    const { failAtRetryCount } = request.params
    const { headers } = request.headers
    const retryCount = headers['x-retry-count'] || 0

    request.log.info({ headers: request.headers, params: request.params }, 'evaluation emulator')

    if (retryCount <= failAtRetryCount) {
      throw new ConnectionError(`Fake connection error first ${failAtRetryCount} times`)
    }
  },
}]

let publisher: AMQPTransport

beforeAll(async () => {
  publisher = await connect({
    connection: { host: 'rabbitmq' },
    debug: true,
    name: 'publisher',
    logOptions: {
      level: 'trace',
    },
  })
})

afterAll(() => publisher.close())

describe('AMQP suite: basic routing', function testSuite() {
  const service = new Microfleet({
    name: 'tester',
    plugins: [
      'logger', // essential plugin
      'validator', // essential plugin
      'amqp', // init amqp
      'router', // enable router
      'router-amqp' // attach amqp transport to router
    ],
    amqp: {
      transport: {
        debug: true,
        logOptions: {
          level: 'trace'
        }
      }
    },
    logger: {
      defaultLogger: {
        level: 'trace'
      },
    },
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
    assert(typeof amqpRoutes.get('echo')?.handler === 'function')
  })

  it('able to dispatch action and return response', async () => {
    const { amqp } = service
    const response = await amqp.publishAndWait('echo', { foo: 'bar' })
    deepStrictEqual(response, { foo: 'bar' })
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
    routerAmqp: {
      prefix: 'amqp-prefix',
    }
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it ('able to observe an action', async () => {
    const amqpRoutes = service.router.routes.get('amqp')

    assert(typeof amqpRoutes.get('echo')?.handler === 'function')
  })

  it ('able to dispatch action and return response', async () => {
    const { amqp } = service

    // @todo dispose of assert
    assert(amqp)

    const response = await amqp.publishAndWait('amqp-prefix.echo', { foo: 'bar' })

    deepStrictEqual(response, { foo: 'bar' })
  })

  it('able to close connection to amqp and consumers', async () => {
    const { amqp } = service
    assert(amqp)

    const closeSpy = spy(service, 'close')
    const consumerSpy = spy(amqp, 'closeAllConsumers')
    // @todo plugin-router-amqp
    // const waitRequestFinishSpy = spy(service.router.requestCountTracker, 'waitForRequestsToFinish')
    const waitRequestFinishSpy = spy(RequestCountTracker, 'waitForRequestsToFinish')

    await service.close()

    assert(consumerSpy.called)
    assert(consumerSpy.calledAfter(waitRequestFinishSpy))
    assert(consumerSpy.calledAfter(closeSpy))
  })
})

describe('AMQP suite: custom redefined routing', function testSuite() {
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
        enabled: {
          'echo': {
            name: 'renamed',
            config: {
              bindingKey: ['10', 'amqp-custom.echo'],
              omitPrefix: true,
            }
          }
        }
      },
    },
    routerAmqp: {
      prefix: 'amqp-custom',
    }
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it('able to observe an action', async () => {
    const amqpRoutes = service.router.routes.get('amqp')
    assert(typeof amqpRoutes.get('renamed')?.handler === 'function')
  })

  it('able to dispatch action and return response', async () => {
    const { amqp } = service

    const headers = { 'routing-key': 'amqp-custom.renamed' }
    const response = await amqp.publishAndWait('amqp-custom.echo', { foo: 'bar' }, { headers })
    deepStrictEqual(response, { foo: 'bar' })

    const response2 = await amqp.publishAndWait('10', { foo: 'bar' }, { headers })
    deepStrictEqual(response2, { foo: 'bar' })
  })
})

describe('AMQP suite: allRoutes config', function testSuite() {
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
        allRoutes: {
          bindingKey: ['10', 'amqp-custom.echo'],
          omitPrefix: true,
        },
      },
    },
    routerAmqp: {
      prefix: 'amqp-custom',
    }
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it('able to observe an action', async () => {
    const amqpRoutes = service.router.routes.get('amqp')
    assert(typeof amqpRoutes.get('echo')?.handler === 'function')
  })

  it('able to dispatch action and return response', async () => {
    const { amqp } = service

    const headers = { 'routing-key': 'amqp-custom.echo' }

    const response = await amqp.publishAndWait('amqp-custom.echo', { foo: 'bar' }, { headers })
    deepStrictEqual(response, { foo: 'bar' })

    const response2 = await amqp.publishAndWait('10', { foo: 'bar' }, { headers })
    deepStrictEqual(response2, { foo: 'bar' })
  })
})

describe('AMQP suite: retry + amqp router prefix', function testSuite() {
  const service = new Microfleet({
    name: 'tester-consumer',
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
        debug: true,
        logOptions: {
          name: 'amqp-consumer',
          level: 'trace',
        }
      },
    },
    logger: {
      debug: true,
      defaultLogger: true,
      options: {
        level: 'trace',
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
    routerAmqp: {
      prefix: 'amqp-prefix',
      retry: {
        enabled: true,
        min: 50,
        max: 250,
        factor: 1.5,
        maxRetries: 3, // 3 attempts only
        predicate: (_: any, actionName: string) => actionName !== 'echo',
      },
    },
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it('able to successfully retry action dispatch', async () => {
    const response = await publisher.publishAndWait('amqp-prefix.echo', { failAtRetryCount: 2 })

    deepStrictEqual(response, { failAtRetryCount: 2 })
  })

  it('able to fail when retry count exceeds max retry attempt count', async () => {
    const { amqp } = service
    assert(amqp)
    await rejects(
      amqp.publishAndWait('amqp-prefix.echo', { failAtRetryCount: 3 }),
      {
        message: 'Fake connection error first 3 times',
        name: 'ConnectionError',
        retryAttempt: 3
      }
    )
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
        queue: 'test-queue-3',
        bindPersistantQueueToHeadersExchange: true,
        neck: 1,
        noAck: true,
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
    routerAmqp: {
      prefix: 'amqp-prefix-2',
      retry: {
        enabled: false,
      },
    },
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it('able to successfully consume dispatch, auto-ack works', async () => {
    const { amqp } = service

    // auto-ack works
    // with neck of 1, we consume 11 messages - 1 error + 10 non-errors

    const responses = []
    for (let i = 0; i < 10; i += 1) {
      responses.push(amqp.publishAndWait('amqp-prefix-2.echo', { failAtRetryCount: -1 }))
    }
    await Promise.all(responses.map((response$P) => response$P.then((response) => {
      deepStrictEqual(response, { failAtRetryCount: -1 })
    })))

    // no retry attempts are reported as we arent using it
    await rejects(
      amqp.publishAndWait('amqp-prefix-2.echo', { failAtRetryCount: 1 }),
      {
        message: 'Fake connection error first 1 times',
        name: 'ConnectionError',
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
    routerAmqp: {
      prefix: 'amqp-prefix',
      retry: {
        enabled: true,
        maxRetries: 3, // 3 attempts only
        min: 50,
        max: 250,
        factor: 1.5,
        predicate: (_: any, actionName: string) => actionName !== 'router-prefix.echo',
      },
    },
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it('able to successfully retry action dispatch', async () => {
    const { amqp } = service

    // @todo dispose of assert
    assert(amqp)

    const response = await amqp.publishAndWait('amqp-prefix.router-prefix.echo', { failAtRetryCount: 2 })

    deepStrictEqual(response, { failAtRetryCount: 2 })
  })

  it ('able to fail when retry count exceeds max retry attempt count', async () => {
    const { amqp } = service

    // @todo dispose of assert
    assert(amqp)

    await rejects(
      amqp.publishAndWait('amqp-prefix.router-prefix.echo', { failAtRetryCount: 3 }),
      {
        message: 'Fake connection error first 3 times',
        name: 'ConnectionError',
        retryAttempt: 3
      }
    )
  })
})
