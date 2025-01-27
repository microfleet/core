import { setTimeout as delay } from 'node:timers/promises'
import { strict as assert } from 'node:assert'
import test from 'node:test'
import { AMQPTransport } from '@microfleet/transport-amqp'
import { Microfleet } from '@microfleet/core'

import { findHealthCheck } from '../utils/health-check'
import { AMQPPluginTransportConnectionConfig } from '@microfleet/plugin-amqp'

test('AMQP suite', async (t) => {
  await t.test('lifecycle', async (t) => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'amqp'],
      amqp: {
        transport: {
          connection: {
            host: [{
              host: 'rabbitmq',
              port: 5672,
            }]
          },
        },
      },
    })

    await t.test('able to connect to amqp when plugin is included', async () => {
      const [amqp] = await service.connect()

      assert.ok(amqp instanceof AMQPTransport)
      assert.doesNotThrow(() => service.amqp)
    })

    await t.test('able to check health', { timeout: 15000 }, async () => {
      const { handler } = findHealthCheck(service, 'amqp')
      // should be ok when service is connected
      const first = await handler()
      assert.ok(first)

      // wait for several heartbeats and make another request
      await delay(5000)
      const second = await handler()
      assert.ok(second)
      assert.ok(service.amqp)

      // close connection to the rabbitmq server
      await service.amqp.close()

      // wait a while and ask again, should throw an error
      await assert.rejects(delay(5000).then(handler))
    })
  })

  await t.test('connection config variation', async (t) => {
    let service: Microfleet

    t.afterEach(async () => {
      if (service) await service.close()
    })

    const createService = (connection: AMQPPluginTransportConnectionConfig) => new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'amqp'],
      amqp: {
        transport: {
          connection,
        },
      },
    })

    await t.test('supports connection config host as string', async () => {
      service = createService({
        host: 'rabbitmq'
      } as any)

      await service.connect()
    })

    await t.test('supports connection config host as string[]', async () => {
      service = createService({
        host: ['rabbitmq'],
        port: 5672,
      })

      await service.connect()
    })
  })
})
