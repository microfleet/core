import { strict as assert } from 'assert'
import { delay } from 'bluebird'
import { spy } from 'sinon'
import * as AMQPTransport from '@microfleet/transport-amqp'
import { Microfleet } from '@microfleet/core'
// @todo RequestCountTracker should be not part of @microfleet/plugin-router
import { RequestCountTracker } from '@microfleet/plugin-router'

import { findHealthCheck } from '../utils/health-check'

jest.setTimeout(15000)

describe('AMQP suite: lifecycle', function testSuite() {
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

    // restore connection for further tests
    await service.amqp.connect()
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
