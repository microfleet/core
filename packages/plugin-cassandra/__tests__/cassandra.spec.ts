import { Microfleet } from '@microfleet/core'
import Cassandra = require('express-cassandra')
import { resolve } from 'path'
import { strict as assert } from 'assert'
import rfdc = require('rfdc')
import { lookup } from 'dns'
import { config } from './config'

describe('Cassandra suite', function testSuite() {
  const cloneDeep = rfdc()

  let service: Microfleet

  // 'lookup ipv4'
  beforeAll((done) => {
    const hostnames = config.cassandra.client.clientOptions.contactPoints
    lookup(hostnames[0], { family: 4 }, (err, addr) => {
      if (err) {
        return done(err)
      }

      hostnames[0] = addr
      return done()
    })
  })

  it('able to connect to cassandra when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'cassandra'],
      cassandra: config.cassandra,
    })

    await service.connect()
    const { cassandra } = service
    expect(cassandra).toBeInstanceOf(Cassandra)
    expect(cassandra.modelInstance).toHaveProperty('Foo')
    expect(service.cassandra).toBeInstanceOf(Cassandra)
  })

  it('able to close connection to cassandra', async () => {
    await service.close()
    assert(!service.cassandra)
  })

  it('should load models from directory', async () => {
    const cassandraConfig = cloneDeep(config.cassandra)
    cassandraConfig.service.models = resolve(__dirname, './models')

    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'cassandra'],
      cassandra: cassandraConfig,
    })

    await service.connect()
    const { cassandra } = service
    try {
      expect(cassandra.modelInstance).toHaveProperty('Bar')
    } finally {
      await service.close()
    }
  })
})
