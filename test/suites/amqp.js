const { expect } = require('chai');

describe('AMQP suite', function testSuite() {
  const Mservice = require('../../src');
  const AMQPTransport = require('@microfleet/transport-amqp');

  it('when service does not include `amqp` plugin, it emits an error or throws', function test() {
    const service = new Mservice({ plugins: [] });
    expect(() => {
      return service.amqp;
    }).to.throw();
  });

  it('able to connect to amqp when plugin is included', function test() {
    this.service = new Mservice({
      plugins: [ 'validator', 'amqp' ],
      amqp: global.SERVICES.amqp,
    });
    return this.service.connect()
      .reflect()
      .then(result => {
        return Promise.resolve(result.value());
      })
      .spread(amqp => {
        expect(amqp).to.be.instanceof(AMQPTransport);
        expect(() => {
          return this.service.amqp;
        }).to.not.throw();
      });
  });

  it('able to close connection to amqp', function test() {
    return this.service.close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        expect(() => {
          return this.service.amqp;
        }).to.throw();
      });
  });
});
