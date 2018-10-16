const Promise = require('bluebird');
const assert = require('assert');
const AMQPTransport = require('@microfleet/transport-amqp');
const { inspectPromise } = require('@makeomatic/deploy');
const { findHealthCheck } = require('../utils');

describe('AMQP suite', function testSuite() {
  const Mservice = require('../../src');

  it('when service does not include `amqp` plugin, it emits an error or throws', function test() {
    const service = new Mservice({ plugins: [] });
    assert.throws(() => service.amqp);
  });

  it('able to connect to amqp when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'opentracing', 'amqp'],
      amqp: global.SERVICES.amqp,
    });
    return this.service.connect()
      .reflect()
      .then(inspectPromise())
      .spread((amqp) => {
        assert.ok(amqp instanceof AMQPTransport);
        assert.doesNotThrow(() => this.service.amqp);
      });
  });

  it('able to check health', async function test() {
    const { handler } = findHealthCheck(this.service, 'amqp');
    // should be ok when service is connected
    const first = await handler();
    assert(first);

    // wait for several heartbeats and make another request
    await Promise.delay(5000);
    const second = await handler();
    assert(second);

    // close connection to the rabbitmq server
    await this.service.amqp.close();

    // wait a while and ask again, should throw an error
    await Promise.delay(5000)
      .then(handler)
      .reflect()
      .then(inspectPromise(false));

    // restore connection for further tests
    await this.service.amqp.connect();
  });

  it('able to close connection to amqp', function test() {
    return this.service.close()
      .reflect()
      .then((result) => {
        assert.ok(result.isFulfilled());
        assert.throws(() => this.service.amqp);
      });
  });
});
