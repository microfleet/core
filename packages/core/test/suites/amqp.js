const Promise = require('bluebird');
const assert = require('assert');
const sinon = require('sinon');
const AMQPTransport = require('@microfleet/transport-amqp');
const { findHealthCheck } = require('../utils');

describe('AMQP suite', function testSuite() {
  require('../config');
  const { Microfleet, ActionTransport } = require('../..');

  let service;

  it('able to connect to amqp when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'opentracing', 'amqp', 'router'],
      amqp: global.SERVICES.amqp,
      router: {
        routes: {
          transports: [
            ActionTransport.amqp,
          ],
        },
      },
    });

    const [amqp] = await service.connect();

    assert.ok(amqp instanceof AMQPTransport);
    assert.doesNotThrow(() => service.amqp);
  });

  it('able to check health', async () => {
    const { handler } = findHealthCheck(service, 'amqp');
    // should be ok when service is connected
    const first = await handler();
    assert(first);

    // wait for several heartbeats and make another request
    await Promise.delay(5000);
    const second = await handler();
    assert(second);

    // close connection to the rabbitmq server
    await service.amqp.close();

    // wait a while and ask again, should throw an error
    await assert.rejects(Promise.delay(5000).then(handler));

    // restore connection for further tests
    await service.amqp.connect();
  });

  it('able to close connection to amqp and consumers', async () => {
    const { amqp } = service;

    const closeSpy = sinon.spy(service, 'close');
    const consumerSpy = sinon.spy(amqp, 'closeAllConsumers');

    const waitRequestFinishSpy = sinon.spy(service.router.requestCountTracker, 'waitForRequestsToFinish');

    await service.close();
    assert(!service.amqp);
    assert(consumerSpy.called);
    assert(consumerSpy.calledAfter(waitRequestFinishSpy));
    assert(consumerSpy.calledAfter(closeSpy));
  });
});
