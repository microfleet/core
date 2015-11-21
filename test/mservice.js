const { expect } = require('chai');

describe('Mservice suite', function testSuite() {
  const Mservice = require('../src');

  it('creates service with no plugins', function test() {
    expect(() => {
      return new Mservice({ plugins: [] });
    }).to.not.throw();
  });

  it('creates service with default configuration', function test() {
    expect(() => {
      return new Mservice();
    }).to.not.throw();
  });

  it('creates service with validator enabled', function test() {
    expect(() => {
      return new Mservice({ plugins: [ 'validator' ] });
    }).to.not.throw();
  });

  it('creates services with logger enabled', function test() {
    expect(() => {
      return new Mservice({ plugins: [ 'logger' ] });
    }).to.not.throw();
  });

  it('creates service with amqp enabled', function test() {
    expect(() => {
      return new Mservice({ plugins: [ 'amqp' ] });
    }).to.not.throw();
  });

  it('creates service with redis enabled', function test() {
    expect(() => {
      return new Mservice({ plugins: [ 'redisCluster' ] });
    }).to.not.throw();
  });

  it('creates service with all plugins enabled', function test() {
    expect(() => {
      this.service = new Mservice({
        plugins: [ 'validator', 'logger', 'amqp', 'redisCluster' ],
        redis: global.SERVICES.redis,
        amqp: global.SERVICES.amqp,
        logger: true,
      });
    }).to.not.throw();
  });

  it('able to connect to all services', function test() {
    const AMQPTransport = require('ms-amqp-transport');
    const { Cluster } = require('ioredis');

    return this.service.connect().reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return result.value();
      })
      .spread((amqp, redis) => {
        expect(amqp).to.be.instanceof(AMQPTransport);
        expect(redis).to.be.instanceof(Cluster);
      });
  });

  it('able to disconnect from all services', function test() {
    return this.service
      .close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
      });
  });
});
