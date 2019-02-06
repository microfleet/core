const assert = require('assert');
const { inspectPromise } = require('@makeomatic/deploy');
const request = require('request-promise');

describe('prometheus plugin', function testSuite() {
  require('../config');
  const { Microfleet: Mservice } = require('../../src');

  let service;

  it('should be able to throw error if plugin is not included', async () => {
    service = new Mservice({ plugins: [] });
    assert(!service.prometheus);
  });

  it('should be able to initialize', async () => {
    service = new Mservice({
      name: 'tester',
      plugins: ['logger', 'validator', 'prometheus'],
    });

    assert.ok(service.prometheus);
  });

  it('should be able to provide metrics', async () => {
    service = new Mservice({
      name: 'tester',
      plugins: ['logger', 'validator', 'prometheus'],
    });

    await service.connect();

    const text = await request('http://0.0.0.0:9102/metrics');
    assert.ok(text.includes(`TYPE application_version_info gauge`))

  });

  after('close', () => (
    service && service.close()
  ));
});
