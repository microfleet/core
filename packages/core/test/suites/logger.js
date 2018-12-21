const Promise = require('bluebird');
const assert = require('assert');
const pino = require('pino');

describe('Logger suite', function testSuite() {
  require('../config');
  const { Microfleet: Mservice } = require('../../src');

  it('when service does not include `logger` plugin, it emits an error or throws', function test() {
    const service = new Mservice({ plugins: [] });
    assert(!service.log);
  });

  it('logger inits with output to stdout', function test() {
    const service = new Mservice({
      name: 'tester',
      plugins: ['validator', 'logger'], // order is important
      logger: {
        defaultLogger: true,
      },
    });

    assert.ok(service.log);
    assert.ok(typeof service.log.info === 'function');
  });

  it('logger inits with output to stdout: debug', function test() {
    const service = new Mservice({
      name: 'tester',
      plugins: ['validator', 'logger'], // order is important
      logger: {
        defaultLogger: true,
        debug: true,
      },
    });

    assert.ok(service.log);
    assert.ok(typeof service.log.info === 'function');
  });

  it('should be able to init custom logger', function test() {
    const logger = pino({ name: 'test' });
    const service = new Mservice({
      name: 'tester',
      plugins: ['validator', 'logger'], // order is important
      logger: {
        defaultLogger: logger,
      },
    });

    assert.deepEqual(service.log, logger);
  });

  it('should be able to init sentry stream', async function test() {
    const service = new Mservice({
      name: 'tester',
      plugins: ['validator', 'logger'], // order is important
      logger: {
        streams: {
          sentry: {
            dsn: 'https://api@sentry.io/1822',
          },
        },
      },
    });

    service.log.info({ sample: 'message', latency: 200 }, 'test')
    service.log.debug({ sample: 'message', latency: 200 }, 'test')
    service.log.debug({ sample: 'message', latency: 200 }, 'test')
    service.log.error(new Error('crap'), 'test')
    service.log.error('failed to produce message', [], new Error('oops'))
    service.log.error('empty object?')

    await Promise.delay(1000);

    assert.ok(service.log);
    assert.ok(typeof service.log.info === 'function');
  });
});
