const path = require('path');
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
      plugins: ['logger', 'validator', 'opentracing', 'router', 'amqp'],
      amqp: {
        ...global.SERVICES.amqp,
        router: {
          enabled: true,
        }
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, './../amqp/helpers/actions'),
          transports: ['amqp'],
        },
      },
    });

    const [amqp] = await service.connect();

    assert.ok(amqp instanceof AMQPTransport);
    assert.doesNotThrow(() => service.amqp);
  });

  it('able to send request and get simple response', async () => {
    const { amqp } = service;
    const result = await amqp.publishAndWait('success', null);

    assert.deepEqual(result, { redirected: true });
  });

  it('able to set response header', async () => {
    const { amqp } = service;
    const result = await amqp.publishAndWait('success-set-header', null,  { simpleResponse: false });

    assert.deepEqual(result, {
      headers: {
        timeout: 10000,
        'x-wow-your-personal-header': 'wow so valuable'
      },
      data: { redirected: true }
    });
  });

  it('able to remove response header', async () => {
    const { amqp } = service;
    const result = await amqp.publishAndWait('success-remove-header', null, { simpleResponse: false });

    assert.deepEqual(result, {
      headers: {
        timeout: 10000,
        'x-wow-your-personal-header': 'wow so valuable'
      },
      data: { redirected: true }
    });

    assert.strictEqual(result.headers['x-remove-me'], undefined);
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
