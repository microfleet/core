const assert = require('assert');
const request = require('request-promise');

describe('prometheus plugin', function testSuite() {
  require('../config');
  const { Microfleet } = require('../..');

  let service;

  it('should be able to throw error if plugin is not included', async () => {
    service = new Microfleet({ plugins: [] });
    assert(!service.prometheus);
  });

  it('should be able to initialize', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'prometheus'],
    });

    assert.ok(service.prometheus);
  });

  it('should be able to provide metrics', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'prometheus'],
    });

    await service.connect();

    const text = await request('http://0.0.0.0:9102/metrics');
    assert.ok(text.includes('TYPE application_version_info gauge'));
    assert.ok(text.includes('TYPE microfleet_request_duration_milliseconds histogram'));
  });

  after('close', () => (
    service && service.close()
  ));
});
