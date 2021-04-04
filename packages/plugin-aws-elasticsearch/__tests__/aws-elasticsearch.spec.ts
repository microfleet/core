import { Client } from '@elastic/elasticsearch';
import { Microfleet } from '@microfleet/core';

describe('AWS Elasticsearch suite', () => {
  let service: Microfleet;

  it('should throw an error when plugin isn\'t included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: [],
    });
    expect(!service.awsElasticsearch);
  });

  it('able to connect to elasticsearch when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'aws-elasticsearch'],
    });

    await service.connect();

    const { awsElasticsearch } = service
    expect(awsElasticsearch).toHaveProperty('transport')
    expect(awsElasticsearch).toBeInstanceOf(Client)
    expect(service.awsElasticsearch).toBeInstanceOf(Client)
  });

  it('able to close connection to elasticsearch', async () => {
    await service.close();
    expect(!service.awsElasticsearch)
  });
});
