const { expect } = require('chai');
const { ReferenceError } = require('common-errors');

describe('Elasticsearch suite', function testSuite() {
  const Mservice = require('../src');

  it('should throw an error when plugin isn\'t included', function test() {
    const service = new Mservice({ plugins: [] });
    expect(() => service.elasticsearch).to.throw();
  });

  it('when log type is set to `service` and service does not include `logger` plugin, it throws an error', function test() {
    expect(() => {
      const service = new Mservice({
        plugins: ['validator', 'elasticsearch'],
        elasticsearch: global.SERVICES.elasticsearch,
      });

      return service.elasticsearch;
    }).to.throw(ReferenceError);
  });

  it('able to connect to elasticsearch when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['logger', 'validator', 'elasticsearch'],
      elasticsearch: global.SERVICES.elasticsearch,
      log: true,
    });

    return this.service.connect()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(elastic => {
        // Since elastic is not an instance of Elasticsearch.Client due to
        // its inner implementation, here we do some duck tests to check it
        expect(elastic).to.have.property('transport');
        expect(elastic).to.have.property('cluster');
        expect(() => this.service.elasticsearch).to.not.throw();
      });
  });

  it('able to close connection to elasticsearch', function test() {
    return this.service.close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        expect(() => this.service.elasticsearch).to.throw();
      });
  });
});
