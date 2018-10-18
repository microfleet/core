const Cassandra = require('express-cassandra');
const cloneDeep = require('lodash/cloneDeep');
const path = require('path');
const assert = require('assert');
const { expect } = require('chai');

describe('Cassandra suite', function testSuite() {
  require('../config');
  const { Microfleet: Mservice } = require('../../src');

  let service;

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

  it('able to connect to cassandra when plugin is included', async () => {
    service = new Mservice({
      plugins: ['validator', 'cassandra'],
      cassandra: global.SERVICES.cassandra,
    });

    const [cassandra] = await service.connect();

    expect(cassandra).to.be.instanceof(Cassandra);
    expect(cassandra.modelInstance).to.have.property('Foo');
    expect(service.cassandra).to.be.instanceof(Cassandra);
  });

  it('able to close connection to cassandra', async () => {
    await service.close();
    assert(!service.cassandra);
  });

  it('should load models from directory', async () => {
    const cassandraConfig = cloneDeep(global.SERVICES.cassandra);
    cassandraConfig.service.models = path.resolve(__dirname, '../cassandra/models');

    service = new Mservice({
      plugins: ['validator', 'cassandra'],
      cassandra: cassandraConfig,
    });

    const [cassandra] = await service.connect();

    try {
      expect(cassandra.modelInstance).to.have.property('Bar');
    } finally {
      await service.close();
    }
  });
});
