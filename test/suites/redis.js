const path = require('path');
const is = require('is');
const assert = require('assert');
const { inspectPromise } = require('@makeomatic/deploy');

describe('Redis suite', function testSuite() {
  const Mservice = require('../../src');
  const Redis = require('ioredis');

  const { Cluster } = Redis;

  it('when service does not include `redis` plugin, it emits an error or throws', function test() {
    const service = new Mservice({ plugins: [] });
    assert.throws(() => service.redis);
  });

  it('able to connect to redis when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'opentracing', 'redisCluster'],
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

  it('able to connect to redis sentinel when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'opentracing', 'redisSentinel'],
      redis: {
        ...global.SERVICES.redisSentinel,
        luaScripts: path.resolve(__dirname, '../fixtures'),
      },
    });

    return this.service.connect()
      .reflect()
      .then(inspectPromise())
      .spread((redis) => {
        assert(redis instanceof Redis);
        assert(is.fn(redis['echo-woo']));
        assert.doesNotThrow(() => this.service.redis);
      });
  });

  it('able to perform migrations', function test() {
    return this.service
      .migrate('redis', '/src/test/fixtures/migrations')
      .then(() => this.service.redis.get('version'))
      .then((version) => {
        assert.equal(version, '10');
        return null;
      });
  });

  it('able to close connection to redis sentinel', function test() {
    return this.service.close()
      .reflect()
      .then(inspectPromise())
      .then(() => {
        assert.throws(() => this.service.redis);
      });
  });
});
