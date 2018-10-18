const assert = require('assert');
const bunyan = require('bunyan');

describe('Logger suite', function testSuite() {
  require('../config');
  const { Microfleet: Mservice } = require('../../src');

  it('when service does not include `logger` plugin, it emits an error or throws', function test() {
    const service = new Mservice({ plugins: [] });
    assert(!service.log);
  });

  it('logger inits with output to stdout', function test() {
    const service = new Mservice({
      plugins: ['validator', 'logger'], // order is important
      logger: {
        defaultLogger: true,
      },
    });

    assert.ok(service.log instanceof bunyan);
    assert.equal(service.log.streams.length, 1);
    assert.equal(service.log.streams[0].level, 30); // 30 - info
  });

  it('logger inits with output to stdout: debug', function test() {
    const service = new Mservice({
      plugins: ['validator', 'logger'], // order is important
      logger: {
        defaultLogger: true,
        debug: true,
      },
    });

    assert.ok(service.log instanceof bunyan);
    assert.equal(service.log.streams.length, 1);
    assert.equal(service.log.streams[0].level, 20); // 20 - debug
  });

  it('logger inits with output to ringBuffer', function test() {
    const service = new Mservice({
      plugins: ['validator', 'logger'], // order is important
      logger: {
        defaultLogger: false,
        trace: true,
      },
    });

    assert.ok(service.log instanceof bunyan);
    assert.equal(service.log.streams.length, 1);
    assert.equal(service.log.streams[0].type, 'raw');
  });

  it('should be able to init custom logger', function test() {
    const logger = bunyan.createLogger({ name: 'test' });
    const service = new Mservice({
      plugins: ['validator', 'logger'], // order is important
      logger: {
        defaultLogger: logger,
      },
    });

    assert.deepEqual(service.log, logger);
  });

  it('should be able to init sentry stream', function test() {
    const service = new Mservice({
      plugins: ['validator', 'logger'], // order is important
      logger: {
        streams: {
          sentry: {
            dns: 'https://api:key@sentry.io/1822',
          },
        },
      },
    });

    assert.ok(service.log instanceof bunyan);
    assert.equal(service.log.streams.length, 1);
    assert.equal(service.log.streams[0].level, 50); // 50 - error
  });
});
