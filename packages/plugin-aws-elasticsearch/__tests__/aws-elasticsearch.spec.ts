import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Client } from '@opensearch-project/opensearch'
import { Microfleet } from '@microfleet/core'

describe.skip('AWS Elasticsearch suite', async () => {
  let service: Microfleet

  it('should throw an error when plugin isn\'t included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: [],
    })
    assert.equal(service.awsElasticsearch, undefined)
  })

  it('able to connect to elasticsearch when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'aws-elasticsearch'],
      awsElasticsearch: {
        node: process.env.AWS_ELASTIC_NODE,
        accessKeyId: process.env.AWS_ELASTIC_KEY_ID,
        secretAccessKey: process.env.AWS_ELASTIC_ACCESS_KEY,
      }
    })

    await service.connect()

    const { awsElasticsearch } = service
    assert.ok(Object.hasOwn(awsElasticsearch, 'transport'))
    assert.ok(awsElasticsearch instanceof Client)
    assert.ok(service.awsElasticsearch instanceof Client)
  })

  it('able to close connection to elasticsearch', async () => {
    await service.close()
    assert.equal(service.awsElasticsearch, undefined)
  })
})
