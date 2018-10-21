const Promise = require('bluebird');
const assert = require('assert');
const AMQPTransport = require('@microfleet/transport-amqp');
const { inspectPromise } = require('@makeomatic/deploy');
const { findHealthCheck } = require('../utils');

describe('AMQP suite', function testSuite() {
  require('../config');
  const { Microfleet: Mservice } = require('../../src');

  let service;

  it('able to connect to amqp when plugin is included', async () => {
    service = new Mservice({
      name: 'tester',
      plugins: ['logger', 'validator', 'opentracing', 'amqp'],
      amqp: global.SERVICES.amqp,
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
    await Promise.delay(5000)
      .then(handler)
      .reflect()
      .then(inspectPromise(false));

    // restore connection for further tests
    await service.amqp.connect();
  });

  it('able to close connection to amqp', async () => {
    await service.close();
    assert(!service.amqp);
  });
});
