import { strict as assert } from 'assert'
import { delay } from 'bluebird'
import { AMQPTransport } from '@microfleet/transport-amqp'
import { Microfleet } from '@microfleet/core'

import { findHealthCheck } from '../utils/health-check'
import { AMQPPluginTransportConnectionConfig } from '@microfleet/plugin-amqp'

jest.setTimeout(15000)

describe('AMQP suite', function testSuite() {
  describe('lifecycle', function testSuite() {
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

    it('able to connect to amqp when plugin is included', async () => {
      const [amqp] = await service.connect()

      assert.ok(amqp instanceof AMQPTransport)
      assert.doesNotThrow(() => service.amqp)
    })

    it('able to check health', async () => {
      const { handler } = findHealthCheck(service, 'amqp')
      // should be ok when service is connected
      const first = await handler()
      assert(first)

      // wait for several heartbeats and make another request
      await delay(5000)
      const second = await handler()
      assert(second)
      assert(service.amqp)

      // close connection to the rabbitmq server
      await service.amqp.close()

      // wait a while and ask again, should throw an error
      await assert.rejects(delay(5000).then(handler))
    })
  })

  describe('connection config variation', function testSuite() {
    let service: Microfleet

    afterEach(async () => {
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

    it('supports connection config host as string', async () => {
      service = createService({
        host: 'rabbitmq'
      } as any)

      await service.connect()
    })

    it('supports connection config host as string[]', async () => {
      service = createService({
        host: ['rabbitmq'],
        port: 5672,
      })

      await service.connect()
    })
  })
})
