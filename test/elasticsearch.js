const { expect } = require('chai')

describe('Elasticsearch suite', function testSuite() {
  const Mservice = require('../src');
  const Elasticsearch = require('elasticsearch');
  const { Client } = Elasticsearch;

  it('able to connect to elasticsearch when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'elasticsearch'],
      elasticsearch: global.SERVICES.elasticsearch
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
        expect(() => {
          return this.service.elasticsearch;
        }).to.not.throw();
      });
  });

  it('able to close connection to elasticsearch', function test() {
    return this.service.close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        expect(() => {
          return this.service.elasticsearch;
        }).to.throw();
      });
  });
});
