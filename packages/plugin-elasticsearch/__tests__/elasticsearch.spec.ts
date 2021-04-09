import assert = require('assert')
import { Microfleet } from '@microfleet/core'

describe('Elasticsearch suite', () => {
  let service: Microfleet

  const getConfig = () => ({
    node: 'http://elasticsearch:9200',
    log: {
      type: 'service',
    },
  })

  it('should throw an error when plugin isn\'t included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: [],
    })
    assert(!service.elasticsearch)
  })

  it('able to connect to elasticsearch when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'elasticsearch'],
      elasticsearch: getConfig(),
    })


    await service.connect()
    const { elasticsearch } = service
    // Since elastic is not an instance of Elasticsearch.Client due to
    // its inner implementation, here we do some duck tests to check it
    expect(elasticsearch).toHaveProperty('transport')
    expect(elasticsearch).toHaveProperty('cluster')
  })

  it('able to close connection to elasticsearch', async () => {
    await service.close()
  })
})
