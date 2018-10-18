const assert = require('assert');
const { ReferenceError } = require('common-errors');
const { expect } = require('chai');

describe('Elasticsearch suite', () => {
  require('../config');
  const { Microfleet: Mservice } = require('../../src');
  let service;

  it('should throw an error when plugin isn\'t included', async () => {
    service = new Mservice({ plugins: [] });
    assert(!service.elasticsearch);
  });

  it('when log type is set to `service` and service does not include `logger` plugin, it throws an error', async () => {
    assert.throws(() => {
      service = new Mservice({
        plugins: ['validator', 'elasticsearch'],
        elasticsearch: global.SERVICES.elasticsearch,
      });
    }, ReferenceError);
  });

  it('able to connect to elasticsearch when plugin is included', async () => {
    service = new Mservice({
      plugins: ['logger', 'validator', 'elasticsearch'],
      elasticsearch: global.SERVICES.elasticsearch,
    });

    const [elastic] = await service.connect();

    // Since elastic is not an instance of Elasticsearch.Client due to
    // its inner implementation, here we do some duck tests to check it
    expect(elastic).to.have.property('transport');
    expect(elastic).to.have.property('cluster');
    assert(service.elasticsearch);
  });

  it('able to close connection to elasticsearch', async () => {
    await service.close();
    assert(!service.elasticsearch);
  });
});
