/* eslint-env node, mocha */
/* eslint-disable prefer-arrow-callback, promise/always-return */
const assert = require('assert');
const { inspectPromise } = require('@makeomatic/deploy');

describe('Redis suite', function testSuite() {
  const Mservice = require('@microfleet/core');
  const Redis = require('ioredis');

  const { Cluster } = Redis;

  it('when service does not include `redis` plugin, it emits an error or throws', function test() {
    const service = new Mservice({ plugins: [] });
    assert.throws(() => service.redis);
  });

  it('able to connect to redis when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'opentracing', 'redis-cluster'],
      redis: global.SERVICES.redis,
    });
    return this.service.connect()
      .reflect()
      .then(inspectPromise())
      .spread((redis) => {
        assert(redis instanceof Cluster);
        assert.doesNotThrow(() => this.service.redis);
      });
  });

  it('able to close connection to redis', function test() {
    return this.service.close()
      .reflect()
      .then(inspectPromise())
      .then(() => {
        assert.throws(() => this.service.redis);
      });
  });
});
