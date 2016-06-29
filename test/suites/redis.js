const path = require('path');
const is = require('is');
const { expect } = require('chai');

describe('Redis suite', function testSuite() {
  const Mservice = require('../../src');
  const Redis = require('ioredis');
  const { Cluster } = Redis;

  it('when service does not include `redis` plugin, it emits an error or throws', function test() {
    const service = new Mservice({ plugins: [] });
    expect(() => service.redis).to.throw();
  });

  it('able to connect to redis when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'redisCluster'],
      redis: global.SERVICES.redis,
    });
    return this.service.connect()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(redis => {
        expect(redis).to.be.instanceof(Cluster);
        expect(() => this.service.redis).to.not.throw();
      });
  });

  it('able to close connection to redis', function test() {
    return this.service.close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        expect(() => this.service.redis).to.throw();
      });
  });

  it('able to connect to redis sentinel when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'redisSentinel'],
      redis: {
        ...global.SERVICES.redisSentinel,
        luaScripts: path.resolve(__dirname, '../fixtures'),
      },
    });
    return this.service.connect()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(redis => {
        expect(redis).to.be.instanceof(Redis);
        expect(() => this.service.redis).to.not.throw();
        expect(is.fn(redis['echo-woo'])).to.be.eq(true);
      });
  });

  it('able to close connection to redis sentinel', function test() {
    return this.service.close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        expect(() => this.service.redis).to.throw();
      });
  });
});
