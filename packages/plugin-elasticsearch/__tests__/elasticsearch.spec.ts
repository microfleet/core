import { strict as assert } from 'node:assert'
import test from 'node:test'
import { Microfleet } from '@microfleet/core'
import { Config } from '@microfleet/plugin-elasticsearch'

const getConfig = (): Config => ({
  node: 'http://elasticsearch:9200',
})

let service: Microfleet

test('Elasticsearch suite', async (t) => {
  t.after(async () => {
    await service?.close()
  })

  await t.test('should throw an error when plugin isn\'t included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: [],
    })
    assert(!service.elasticsearch)
  })

  await t.test('able to connect to elasticsearch when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'elasticsearch'],
      elasticsearch: getConfig(),
    })

    await service.connect()
    const { elasticsearch } = service

    assert(elasticsearch.transport, 'elasticsearch should have transport property')
    assert(elasticsearch.cluster, 'elasticsearch should have cluster property')
  })
})
