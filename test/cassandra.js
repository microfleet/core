const Cassandra = require('express-cassandra');
const cloneDeep = require('lodash/cloneDeep');
const { expect } = require('chai');
const Promise = require('bluebird');

describe('Cassandra suite', function testSuite() {
  const Mservice = require('../src');

  // make sure that cassandra is up
  before(function before() {
    this.timeout(1000 * 101);
    return Promise.delay(1000 * 100, true);
  });

  it('able to connect to cassandra when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'cassandra'],
      cassandra: global.SERVICES.cassandra
    });

    return this.service.connect()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(cassandra => {
        expect(cassandra).to.be.instanceof(Cassandra);
        expect(cassandra.modelInstance).to.have.property('Foo');
        expect(this.service.cassandra).to.be.instanceof(Cassandra);
      });
  });

  it('able to close connection to cassandra', function test() {
    return this.service.close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        expect(() => {
          return this.service.cassandra;
        }).to.throw();
      });
  });

  it('should load models from directory', function test() {
    const cassandraConfig = cloneDeep(global.SERVICES.cassandra);
    cassandraConfig.service.models = __dirname + '/cassandra/models';

    this.service = new Mservice({
      plugins: ['validator', 'cassandra'],
      cassandra: cassandraConfig
    });

    return this.service.connect()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(cassandra => {
        expect(this.service.cassandra.modelInstance).to.have.property('Bar');
      })
      .finally(() => this.service.close());
  });
});
