const { expect } = require('chai');
const bunyan = require('bunyan');

describe('Logger suite', function testSuite() {
  const Mservice = require('../src');

  it('when service does not include `logger` plugin, it emits an error or throws', function test() {
    const service = new Mservice({ plugins: [] });
    expect(() => {
      return service.log;
    }).to.throw();
  });

  it('logger inits with output to stdout', function test() {
    expect(() => {
      const service = new Mservice({
        plugins: [ 'logger' ],
        logger: true,
      });

      expect(service.log).to.be.instanceof(bunyan);
      expect(service.log.streams).to.have.length.of(2);
    }).to.not.throw();
  });

  it('logger inits with output to ringBuffer', function test() {
    expect(() => {
      const service = new Mservice({
        plugins: [ 'logger' ],
        logger: false,
      });

      expect(service.log).to.be.instanceof(bunyan);
      expect(service.log.streams).to.have.length.of(1);
      expect(service.log.streams[0].type).to.be.eq('raw');
    }).to.not.throw();
  });

  it('logger inits with output to ringBuffer', function test() {
    expect(() => {
      const log = bunyan.createLogger({ name: 'test' });
      const service = new Mservice({
        plugins: [ 'logger' ],
        logger: log,
      });

      expect(service.log).to.be.eq(log);
    }).to.not.throw();
  });
});
