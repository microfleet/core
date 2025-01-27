import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Microfleet } from '@microfleet/core'

let service: Microfleet
let couchdb: Microfleet['couchdb']

test('couchdb', async (t) => {
  t.after(async () => {
    if (service) await service.close()
  })

  await t.test('should be able to initialize', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'couchdb'],
      couchdb: {
        connection: 'http://admin:admin@couchdb:5984',
        database: 'sample',
        indexDefinitions: [{
          index: {
            fields: [{ group: 'desc' }, { date: 'desc' }, { boring: 'desc' }],
          },
          name: 'test',
          ddoc: 'immutable',
        }],
      },
    })
  })

  await t.test('should be able to connect', async () => {
    await service.connect()
    assert.ok(service.couchdb)
    couchdb = service.couchdb
  })

  await t.test('should be able to create document', async () => {
    const result = await couchdb?.insert({
      _id: 'happy',
      ami: true,
    })

    assert.equal(result?.ok, true)
    assert.equal(result?.id, 'happy')
  })

  await t.test('should be able to disconnect', async () => {
    await service.close()
  })

  await t.test('should be able to connect again', async () => {
    await service.connect()
  })
})
