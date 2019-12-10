const Promise = require('bluebird');
const assert = require('assert');
const sinon = require('sinon');
const path = require('path');
const AMQPTransport = require('@microfleet/transport-amqp');
const Errors = require('common-errors');
const { findHealthCheck } = require('../utils');

describe('AMQP suite: lifecycle', function testSuite() {
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

describe('AMQP suite: basic routing', function testSuite() {
  require('../config');
  const { Microfleet, ActionTransport } = require('../..');

  let service;
  before(async function () {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'opentracing', 'amqp', 'router'],
      amqp: {
        ...global.SERVICES.amqp,
        router: {
          enabled: true,
          prefix: '',
        },
      },
      router: {
        extensions: { register: [] },
        routes: {
          directory: path.resolve(__dirname, '../amqp/helpers/actions'),
          transports: [
            ActionTransport.amqp,
          ],
        },
      },
    });
    await service.connect();
  });
  after(async function () {
    await service.close();

    service = null;
  });

  it('able to attach amqp plugin with router enabled', async () => {
    const { amqp } = service;

    assert.ok(amqp instanceof AMQPTransport);
    assert.doesNotThrow(() => service.amqp);
  });

  it ('able to observe an action', async () => {
    const { amqp: amqpRoutes } = service.router.routes;

    assert.ok(typeof amqpRoutes.echo === 'function');
  })

  it ('able to dispatch action and return response', async () => {
    const { amqp } = service;

    const response = await amqp.publishAndWait('echo', { foo: 'bar' });

    assert.deepStrictEqual(response, { foo: 'bar' });
  });
});

describe('AMQP suite: prefixed routing', function testSuite() {
  require('../config');
  const { Microfleet, ActionTransport } = require('../..');

  let service;
  before(async function () {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'opentracing', 'amqp', 'router'],
      amqp: {
        ...global.SERVICES.amqp,
        router: {
          enabled: true,
          prefix: 'amqp-prefix',
        },
      },
      router: {
        extensions: { register: [] },
        routes: {
          directory: path.resolve(__dirname, '../amqp/helpers/actions'),
          transports: [
            ActionTransport.amqp,
          ],
        },
      },
    });
    await service.connect();
  });
  after(async function () {
    await service.close();

    service = null;
  });

  it ('able to observe an action', async () => {
    const { amqp: amqpRoutes } = service.router.routes;

    assert.ok(typeof amqpRoutes.echo === 'function');
  });

  it ('able to dispatch action and return response', async () => {
    const { amqp } = service;

    const response = await amqp.publishAndWait('amqp-prefix.echo', { foo: 'bar' });

    assert.deepStrictEqual(response, { foo: 'bar' });
  });
});

describe('AMQP suite: retry + amqp router prefix', function testSuite() {
  require('../config');
  const { Microfleet, ActionTransport } = require('../..');

  let service;
  before(async function () {
    const failedActionEmulator = [{
      point: 'preHandler',
      async handler(request) {
        const { failAtRetryCount } = request.params;
        const { headers } = request.headers;
        const retryCount = headers['x-retry-count'] || 0;
        if (retryCount <= failAtRetryCount) {
          throw new Errors.ConnectionError('Fake connection error first three times');
        }
        return [request];
      },
    }];

    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'opentracing', 'amqp', 'router'],
      amqp: {
        transport: {
          ...global.SERVICES.amqp.transport,
          queue: 'test-queue',
          bindPersistantQueueToHeadersExchange: true,
          neck: 10,
        },
        router: {
          enabled: true,
          prefix: 'amqp-prefix',
        },
        retry: {
          enabled: true,
          min: 100,
          max: 30 * 60 * 1000,
          factor: 1.2,
          maxRetries: 3, // 3 attempts only
          predicate(error, actionName) {
            if (actionName === 'echo') {
              return false;
            }

            return true;
          },
        },
      },
      router: {
        extensions: {
          enabled: ['preHandler'],
          register: [failedActionEmulator]
        },
        routes: {
          directory: path.resolve(__dirname, '../amqp/helpers/actions'),
          transports: [
            ActionTransport.amqp,
          ],
        },
      },
    });
    await service.connect();
  });
  after(async function () {
    await service.close();

    service = null;
  });

  it('able to attach amqp plugin with configured retry', async () => {
    const { amqp } = service;

    assert.ok(amqp instanceof AMQPTransport);
    assert.doesNotThrow(() => service.amqp);
  });

  it ('able to successfully retry action dispatch', async () => {
    const { amqp } = service;

    const response = await amqp
      .publishAndWait('amqp-prefix.echo', { failAtRetryCount: 2 });

    assert.deepStrictEqual(response, { failAtRetryCount: 2 });
  });

  it ('able to fail when retry count exceeds max retry attempt count', async () => {
    const { amqp } = service;

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
    );
  });
});

describe('AMQP suite: retry + amqp router prefix + router prefix', function testSuite() {
  require('../config');
  const { Microfleet, ActionTransport } = require('../..');

  let service;
  before(async function () {
    const failedActionEmulator = [{
      point: 'preHandler',
      async handler(request) {
        const { failAtRetryCount } = request.params;
        const { headers } = request.headers;
        const retryCount = headers['x-retry-count'] || 0;
        if (retryCount <= failAtRetryCount) {
          throw new Errors.ConnectionError('Fake connection error first three times');
        }
        return [request];
      },
    }];

    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'opentracing', 'amqp', 'router'],
      amqp: {
        transport: {
          ...global.SERVICES.amqp.transport,
          queue: 'test-queue',
          bindPersistantQueueToHeadersExchange: true,
          neck: 10,
        },
        router: {
          enabled: true,
          prefix: 'amqp-prefix',
        },
        retry: {
          enabled: true,
          min: 100,
          max: 30 * 60 * 1000,
          factor: 1.2,
          maxRetries: 3, // 3 attempts only
          predicate(error, actionName) {
            if (actionName === 'router-prefix.echo') {
              return false;
            }

            return true;
          },
        },
      },
      router: {
        extensions: {
          enabled: ['preHandler'],
          register: [failedActionEmulator]
        },
        routes: {
          prefix: 'router-prefix',
          directory: path.resolve(__dirname, '../amqp/helpers/actions'),
          transports: [
            ActionTransport.amqp,
          ],
        },
      },
    });
    await service.connect();
  });
  after(async function () {
    await service.close();

    service = null;
  });

  it('able to attach amqp plugin with configured retry', async () => {
    const { amqp } = service;

    assert.ok(amqp instanceof AMQPTransport);
    assert.doesNotThrow(() => service.amqp);
  });

  it ('able to successfully retry action dispatch', async () => {
    const { amqp } = service;

    const response = await amqp
      .publishAndWait('amqp-prefix.router-prefix.echo', { failAtRetryCount: 2 });

    assert.deepStrictEqual(response, { failAtRetryCount: 2 });
  });

  it ('able to fail when retry count exceeds max retry attempt count', async () => {
    const { amqp } = service;

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
    );
  });
});
