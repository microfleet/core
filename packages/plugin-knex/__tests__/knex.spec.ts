import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { Microfleet, ConnectorsTypes } from '@microfleet/core'

test('knex plugin', async (t) => {
  let service: Microfleet

  t.afterEach(async () => {
    if (service) await service.close()
  })

  await t.test('should be able to initialize', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'knex'],
      knex: {
        client: 'pg',
        connection: 'postgres://postgres@postgres:5432/postgres',
      },
    })

    await service.register()

    assert.ok(service.knex)
  })

  await t.test('should be able to connect', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'knex'],
      knex: {
        client: 'pg',
        connection: 'postgres://postgres@postgres:5432/postgres',
      },
    })

    await service.register()
    await service.connect()
    const { knex } = service

    // default settings in
    const { pool } = knex.client
    // this is from tarn (https://github.com/vincit/tarn.js)
    assert.ok(pool.numUsed() + pool.numFree() + pool.numPendingCreates() >= 1, 'not enough connections')
  })

  await t.test('should be able to make query', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'knex'],
      knex: {
        client: 'pg',
        connection: 'postgres://postgres@postgres:5432/postgres',
      },
    })

    await service.register()
    await service.connect()
    const { knex } = service

    const result = await knex
      .raw('SELECT datname FROM pg_database WHERE datistemplate = false;')

    assert.equal(result.rows[0].datname, 'postgres')
  })

  await t.test('should be able to disconnect', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'knex'],
      knex: {
        client: 'pg',
        connection: 'postgres://postgres@postgres:5432/postgres',
      },
    })

    await service.register()
    await service.connect()
    await service.close()

    assert.equal(service.knex.client.pool, undefined)
  })

  await t.test('should be able to run migrations', async () => {
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
})
