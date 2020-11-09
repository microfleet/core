import { Microfleet } from '@microfleet/core'

let service: Microfleet
let couchdb: Microfleet['couchdb']

test('should be able to initialize', async () => {
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

test('should be able to connect', async () => {
  await service.connect()
  expect(service.couchdb).toBeDefined()
  couchdb = service.couchdb
})

test('should be able to create document', async () => {
  const result = await couchdb.insert({
    _id: 'happy',
    ami: true,
  })

  expect(result.ok).toBe(true)
  expect(result.id).toBe('happy')
})

test('should be able to disconnect', async () => {
  await service.close()
})

test('should be able to connect again', async () => {
  await service.connect()
})

afterAll(async () => {
  if (service) await service.close()
})
