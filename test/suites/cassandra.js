const Promise = require('bluebird');
const Cassandra = require('express-cassandra');
const cloneDeep = require('lodash/cloneDeep');
const path = require('path');
const { expect } = require('chai');

describe('Cassandra suite', function testSuite() {
  const Mservice = require('../../src');

  before('lookup ipv4', (done) => {
    const dns = require('dns');
    const hostnames = global.SERVICES.cassandra.client.clientOptions.contactPoints;
    dns.lookup(hostnames[0], { family: 4 }, (err, addr) => {
      if (err) {
        return done(err);
      }

      hostnames[0] = addr;
      return done();
    });
  });

  it('able to connect to cassandra when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'cassandra'],
      cassandra: global.SERVICES.cassandra,
    });

    return this.service.connect()
      .reflect()
      .then((result) => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread((cassandra) => {
        expect(cassandra).to.be.instanceof(Cassandra);
        expect(cassandra.modelInstance).to.have.property('Foo');
        expect(this.service.cassandra).to.be.instanceof(Cassandra);
      });
  });

  it('able to close connection to cassandra', function test() {
    return this.service.close()
      .reflect()
      .then((result) => {
        expect(result.isFulfilled()).to.be.eq(true);
        expect(() => this.service.cassandra).to.throw();
      });
  });

  it('should load models from directory', function test() {
    const cassandraConfig = cloneDeep(global.SERVICES.cassandra);
    cassandraConfig.service.models = path.resolve(__dirname, '../cassandra/models');

    this.service = new Mservice({
      plugins: ['validator', 'cassandra'],
      cassandra: cassandraConfig,
    });

    return this.service.connect()
      .reflect()
      .then((result) => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread((cassandra) => {
        expect(cassandra.modelInstance).to.have.property('Bar');
      })
      .finally(() => this.service.close());
  });
});
