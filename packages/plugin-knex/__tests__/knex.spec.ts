import { strict as assert } from 'assert'
import { Microfleet, ConnectorsTypes } from '@microfleet/core'
import Knex = require('knex')

describe('knex plugin', () => {
  let service: Microfleet

  it('should be able to initialize', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'knex'],
      knex: {
        client: 'pg',
        connection: 'postgres://postgres@postgres:5432/postgres',
      },
    })

    assert.ok(service.knex)
  })

  it('should be able to connect', async () => {
    const [knex] = await service.connect()

    // default settings in
    const { pool } = (knex as Knex).client
    // this is from tarn (https://github.com/vincit/tarn.js)
    assert.ok(pool.numUsed() + pool.numFree() + pool.numPendingCreates() >= 1, 'not enough connections')
  })

  it('should be able to make query', async () => {
    const { knex } = service

    const result = await knex
      .raw('SELECT datname FROM pg_database WHERE datistemplate = false;')

    assert.equal(result.rows[0].datname, 'postgres')
  })

  it('should be able to disconnect', async () => {
    await service.close()

    assert.equal(service.knex.client.pool, undefined)
  })

  it('should be able to run migrations', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'knex'],
      knex: {
        client: 'pg',
        connection: 'postgres://postgres@postgres:5432/postgres',
      },
    })

    service.addConnector(
      ConnectorsTypes.migration,
      () => service.migrate('knex')
    )

    try {
      await assert.rejects(service.connect(), {
        path: '/src/packages/plugin-knex/migrations',
      })
    } finally {
      await service.close()
    }
  })

  afterAll(async () => {
    if (service) await service.close()
  })
})
