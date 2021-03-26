const assert = require('assert');
import { Microfleet } from '@microfleet/core';
const { expect } = require('chai');

describe('AWS Elasticsearch suite', () => {
  let service: any;

  it('should throw an error when plugin isn\'t included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: [],
    });
    assert(!service.awsElasticsearch);
  });

  it('able to connect to elasticsearch when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'aws-elasticsearch'],
    });

    const [elastic] = await service.connect();

    // Since elastic is not an instance of Elasticsearch.Client due to
    // its inner implementation, here we do some duck tests to check it
    expect(elastic).to.have.property('transport');
    expect(elastic).to.have.property('cluster');
    assert(service.awsElasticsearch);
  });

  it('able to close connection to elasticsearch', async () => {
    await service.close();
    assert(!service.elasticsearch);
  });
});
