/* eslint-disable prefer-arrow-callback */
const assert = require('assert');

describe('Mservice suite', function testSuite() {
  require('../config');
  const { Microfleet: Mservice } = require('../../src');
  const constants = require('../../src/constants');

  it('throws with no name defined', function test() {
    assert.throws(() => new Mservice());
  });

  it('creates service with no plugins', function test() {
    assert.doesNotThrow(() => new Mservice({ name: 'tester', plugins: [] }));
  });

  it('creates service with default configuration', function test() {
    assert.doesNotThrow(() => new Mservice({ name: 'tester' }));
  });

  it('creates service with validator enabled', function test() {
    assert.doesNotThrow(() => new Mservice({ name: 'tester', plugins: ['validator'] }));
  });

  it('creates services with logger enabled', function test() {
    assert.doesNotThrow(() => new Mservice({ name: 'tester', plugins: ['logger', 'validator'] }));
  });

  it('creates service with amqp enabled', function test() {
    assert.doesNotThrow(() => new Mservice({ name: 'tester', plugins: ['amqp', 'logger', 'validator'] }));
  });

  it('creates service with redis enabled', function test() {
    assert.doesNotThrow(() => new Mservice({
      name: 'tester',
      plugins: ['logger', 'validator', 'redisCluster'],
      redis: global.SERVICES.redis,
    }));
  });

  it('creates service with hooks enabled', function test() {
    assert.doesNotThrow(() => new Mservice({
      name: 'tester',
      plugins: [],
      hooks: {
        'event:test': function eventTest() {
          return 'OK';
        },
        'event:valid': [
          function eventValid() {
            return 1;
          },
          function eventValid2() {
            return 2;
          },
        ],
      },
    }));
  });

  it('creates service with all plugins enabled', function test() {
    assert.doesNotThrow(() => {
      this.service = new Mservice({
        name: 'tester',
        plugins: ['validator', 'logger', 'amqp', 'redisCluster'],
        redis: global.SERVICES.redis,
        amqp: global.SERVICES.amqp,
        logger: {
          defaultLogger: true,
        },
        hooks: {
          masala: function chai(a, b) {
            return `chai with ${a} and ${b}`;
          },
        },
      });
    });
  });

  it('able to connect to all services', function test() {
    const AMQPTransport = require('@microfleet/transport-amqp');
    const { Cluster } = require('ioredis');

    return this.service.connect().reflect()
      .then((result) => {
        assert.ok(result.isFulfilled());
        return result.value();
      })
      .spread((redis, amqp) => {
        assert(redis instanceof Cluster);
        assert(amqp instanceof AMQPTransport);
      });
  });

  it('init hooks and waits for their completion', function test() {
    return this.service
      .hook('masala', 'dorothy', 'chris')
      .reflect()
      .then((result) => {
        assert.ok(result.isFulfilled());
        assert.deepStrictEqual(result.value(), [
          'chai with dorothy and chris',
        ]);
      });
  });

  it('able to return summary of health statuses of plugins', async function test() {
    const registeredChecks = this.service.getHealthChecks();
    const result = await this.service.getHealthStatus();

    assert.strictEqual(result.status, constants.PLUGIN_STATUS_OK);
    assert.strictEqual(result.failed.length, 0);
    assert.strictEqual(result.alive.length, registeredChecks.length);
  });

  it('able to disconnect from all services', function test() {
    return this.service
      .close()
      .reflect()
      .then((result) => {
        assert.ok(result.isFulfilled());
      });
  });
});
