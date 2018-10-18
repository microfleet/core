const path = require('path');
const is = require('is');
const assert = require('assert');
const { findHealthCheck } = require('../utils');

describe('Redis suite', function testSuite() {
  require('../config');
  const { Microfleet: Mservice } = require('../../src');
  const Redis = require('ioredis');

  const { Cluster } = Redis;
  let service;

  it('able to connect to redis when plugin is included', async () => {
    service = new Mservice({
      name: 'tester',
      plugins: ['validator', 'opentracing', 'redisCluster'],
      redis: global.SERVICES.redis,
    });

    const [redis] = await service.connect()

    assert(redis instanceof Cluster);
    assert(service.redis);

    const check = findHealthCheck(service, 'redis');
    const result = await check.handler();
    assert(result);
  });

  it('able to close connection to redis', async () => {
    await service.close();
    assert(!service.redis);
  });

  it('able to connect to redis sentinel when plugin is included', async () => {
    service = new Mservice({
      name: 'tester',
      plugins: ['validator', 'opentracing', 'redisSentinel'],
      redis: Object.assign({}, global.SERVICES.redisSentinel, { luaScripts: path.resolve(__dirname, '../fixtures') }),
    });

    const [redis] = await service.connect();

    assert(redis instanceof Redis);
    assert(is.fn(redis['echo-woo']));
    assert.doesNotThrow(() => service.redis);

    const check = findHealthCheck(service, 'redis');
    const result = await check.handler();
    assert(result);
  });

  it('able to perform migrations', async () => {
    await service
      .migrate('redis', '/src/packages/core/test/fixtures/migrations');

    const version = await service.redis.get('version');
    assert.equal(version, '10');
  });

  it('able to close connection to redis sentinel', async () => {
    await service.close();
    assert(!service.redis);
  });
});
