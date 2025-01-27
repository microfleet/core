import { strict as assert, deepStrictEqual, rejects } from 'assert'
import { resolve } from 'path'
import { ConnectionError } from 'common-errors'
import { Microfleet } from '@microfleet/core'
import { Lifecycle, ServiceRequest } from '@microfleet/plugin-router'
import { spy } from 'sinon'
import { RequestCountTracker } from '@microfleet/plugin-router'
import { AMQPTransport, connect } from '@microfleet/transport-amqp'
import { test } from 'node:test'

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

test('AMQP Router Plugin Tests', async (t) => {
  let publisher: AMQPTransport

  t.before(async () => {
    publisher = await connect({
      connection: { host: 'rabbitmq' },
      debug: true,
      name: 'publisher',
      logOptions: {
        level: 'trace',
      },
    })
  })

  t.after(async () => {
    await publisher.close()
  })

  await t.test('AMQP suite: basic routing', async (t) => {
    let service: Microfleet

    t.before(async () => {
      service = new Microfleet({
        name: 'tester',
        plugins: [
          'logger',
          'validator',
          'amqp',
          'router',
          'router-amqp'
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

      await service.connect()
    })

    t.after(async () => {
      await service.close()
    })

    await t.test('able to observe an action', async () => {
      const amqpRoutes = service.router.routes.get('amqp')
      assert(typeof amqpRoutes.get('echo')?.handler === 'function')
    })

    await t.test('able to dispatch action and return response', async () => {
      const { amqp } = service
      const response = await amqp.publishAndWait('echo', { foo: 'bar' })
      deepStrictEqual(response, { foo: 'bar' })
    })
  })

  await t.test('AMQP suite: prefixed routing', async (t) => {
    let service: Microfleet

    t.before(async () => {
      service = new Microfleet({
        name: 'tester',
        plugins: [
          'logger',
          'validator',
          'amqp',
          'router',
          'router-amqp'
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

      await service.connect()
    })

    t.after(async () => {
      await service.close()
    })

    await t.test('able to observe an action', async () => {
      const amqpRoutes = service.router.routes.get('amqp')
      assert(typeof amqpRoutes.get('echo')?.handler === 'function')
    })

    await t.test('able to dispatch action and return response', async () => {
      const { amqp } = service
      assert(amqp)
      const response = await amqp.publishAndWait('amqp-prefix.echo', { foo: 'bar' })
      deepStrictEqual(response, { foo: 'bar' })
    })

    await t.test('able to close connection to amqp and consumers', async () => {
      const { amqp } = service
      assert(amqp)

      const closeSpy = spy(service, 'close')
      const consumerSpy = spy(amqp, 'closeAllConsumers')
      const waitRequestFinishSpy = spy(RequestCountTracker, 'waitForRequestsToFinish')

      await service.close()

      assert(consumerSpy.called)
      assert(consumerSpy.calledAfter(waitRequestFinishSpy))
      assert(consumerSpy.calledAfter(closeSpy))
    })
  })

  await t.test('AMQP suite: custom redefined routing', async (t) => {
    let service: Microfleet

    t.before(async () => {
      service = new Microfleet({
        name: 'tester',
        plugins: [
          'logger',
          'validator',
          'amqp',
          'router',
          'router-amqp'
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
          }
        },
        routerAmqp: {
          prefix: 'amqp-custom',
        }
      })

      await service.connect()
    })

    t.after(async () => {
      await service.close()
    })

    await t.test('able to observe an action', async () => {
      const amqpRoutes = service.router.routes.get('amqp')
      assert(typeof amqpRoutes.get('renamed')?.handler === 'function')
    })

    await t.test('able to dispatch action and return response', async () => {
      const { amqp } = service
      const headers = { 'routing-key': 'amqp-custom.renamed' }

      const response = await amqp.publishAndWait('amqp-custom.echo', { foo: 'bar' }, { headers })
      deepStrictEqual(response, { foo: 'bar' })

      const response2 = await amqp.publishAndWait('10', { foo: 'bar' }, { headers })
      deepStrictEqual(response2, { foo: 'bar' })
    })
  })

  await t.test('AMQP suite: allRoutes config', async (t) => {
    let service: Microfleet

    t.before(async () => {
      service = new Microfleet({
        name: 'tester',
        plugins: [
          'logger',
          'validator',
          'amqp',
          'router',
          'router-amqp'
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

      await service.connect()
    })

    t.after(async () => {
      await service.close()
    })

    await t.test('able to observe an action', async () => {
      const amqpRoutes = service.router.routes.get('amqp')
      assert(typeof amqpRoutes.get('echo')?.handler === 'function')
    })

    await t.test('able to dispatch action and return response', async () => {
      const { amqp } = service
      const headers = { 'routing-key': 'amqp-custom.echo' }

      const response = await amqp.publishAndWait('amqp-custom.echo', { foo: 'bar' }, { headers })
      deepStrictEqual(response, { foo: 'bar' })

      const response2 = await amqp.publishAndWait('10', { foo: 'bar' }, { headers })
      deepStrictEqual(response2, { foo: 'bar' })
    })
  })

  await t.test('AMQP suite: retry + amqp router prefix', async (t) => {
    let service: Microfleet

    t.before(async () => {
      service = new Microfleet({
        name: 'tester-consumer',
        plugins: [
          'logger',
          'validator',
          'amqp',
          'router',
          'router-amqp'
        ],
        amqp: {
          transport: {
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
            maxRetries: 3,
            predicate: (_: any, actionName: string) => actionName !== 'echo',
          },
        },
      })

      await service.connect()
    })

    t.after(async () => {
      await service.close()
    })

    await t.test('able to successfully retry action dispatch', async () => {
      const response = await publisher.publishAndWait('amqp-prefix.echo', { failAtRetryCount: 2 })
      deepStrictEqual(response, { failAtRetryCount: 2 })
    })

    await t.test('able to fail when retry count exceeds max retry attempt count', async () => {
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

  await t.test('AMQP suite: retry + amqp router prefix - no retry', async (t) => {
    let service: Microfleet

    t.before(async () => {
      service = new Microfleet({
        name: 'tester',
        plugins: [
          'logger',
          'validator',
          'amqp',
          'router',
          'router-amqp'
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

      await service.connect()
    })

    t.after(async () => {
      await service.close()
    })

    await t.test('able to successfully consume dispatch, auto-ack works', async () => {
      const { amqp } = service

      const responses = []
      for (let i = 0; i < 10; i += 1) {
        responses.push(amqp.publishAndWait('amqp-prefix-2.echo', { failAtRetryCount: -1 }))
      }
      await Promise.all(responses.map((response$P) => response$P.then((response) => {
        deepStrictEqual(response, { failAtRetryCount: -1 })
      })))

      await rejects(
        amqp.publishAndWait('amqp-prefix-2.echo', { failAtRetryCount: 1 }),
        {
          message: 'Fake connection error first 1 times',
          name: 'ConnectionError',
        }
      )
    })
  })

  await t.test('AMQP suite: retry + amqp router prefix + router prefix', async (t) => {
    let service: Microfleet

    t.before(async () => {
      service = new Microfleet({
        name: 'tester',
        plugins: [
          'logger',
          'validator',
          'amqp',
          'router',
          'router-amqp'
        ],
        amqp: {
          transport: {
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
            maxRetries: 3,
            min: 50,
            max: 250,
            factor: 1.5,
            predicate: (_: any, actionName: string) => actionName !== 'router-prefix.echo',
          },
        },
      })

      await service.connect()
    })

    t.after(async () => {
      await service.close()
    })

    await t.test('able to successfully retry action dispatch', async () => {
      const { amqp } = service
      assert(amqp)
      const response = await amqp.publishAndWait('amqp-prefix.router-prefix.echo', { failAtRetryCount: 2 })
      deepStrictEqual(response, { failAtRetryCount: 2 })
    })

    await t.test('able to fail when retry count exceeds max retry attempt count', async () => {
      const { amqp } = service
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
})
