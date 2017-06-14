/* eslint-disable prefer-arrow-callback */
const { expect } = require('chai');

describe('Mservice suite', function testSuite() {
  const Mservice = require('../../src');

  it('creates service with no plugins', function test() {
    expect(() => new Mservice({ plugins: [] })).to.not.throw();
  });

  it('creates service with default configuration', function test() {
    expect(() => new Mservice()).to.not.throw();
  });

  it('creates service with validator enabled', function test() {
    expect(() => new Mservice({ plugins: ['validator'] })).to.not.throw();
  });

  it('creates services with logger enabled', function test() {
    expect(() => new Mservice({ plugins: ['logger'] })).to.not.throw();
  });

  it('creates service with amqp enabled', function test() {
    expect(() => new Mservice({ plugins: ['amqp'] })).to.not.throw();
  });

  it('creates service with redis enabled', function test() {
    expect(() => new Mservice({ plugins: ['redisCluster'] })).to.not.throw();
  });

  it('creates service with hooks enabled', function test() {
    expect(() => new Mservice({
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
    })).to.not.throw();
  });

  it('creates service with all plugins enabled', function test() {
    expect(() => {
      this.service = new Mservice({
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
    }).to.not.throw();
  });

  it('able to connect to all services', function test() {
    const AMQPTransport = require('@microfleet/transport-amqp');
    const { Cluster } = require('ioredis');

    return this.service.connect().reflect()
      .then((result) => {
        expect(result.isFulfilled()).to.be.eq(true);
        return result.value();
      })
      .spread((redis, amqp) => {
        expect(redis).to.be.instanceof(Cluster);
        expect(amqp).to.be.instanceof(AMQPTransport);
      });
  });

  it('init hooks and waits for their completion', function test() {
    return this.service
      .hook('masala', 'dorothy', 'chris')
      .reflect()
      .then((result) => {
        expect(result.isFulfilled()).to.be.eq(true);
        expect(result.value()).to.be.deep.eq([
          'chai with dorothy and chris',
        ]);
      });
  });

  it('able to disconnect from all services', function test() {
    return this.service
      .close()
      .reflect()
      .then((result) => {
        expect(result.isFulfilled()).to.be.eq(true);
      });
  });
});
