const assert = require('assert');

describe('plugins system', function testSuite() {
  require('../config');
  const { Microfleet: Mservice } = require('../../src');

  let service

  it('should be able to load additional plugins', async () => {
    const config = {
      name: 'plugins',
      plugins: [ 'validator', 'logger', 'router', 'http', 'redisCluster' ],
      addPlugins: ['redisSentinel', 'prometheus'],
      redis: {
        sentinels: [
          {
            host: 'redis-sentinel',
            port: 26379,
          },
        ],
        name: 'mservice',
        options: {},
      }
    }
    service = new Mservice(config)
    assert.ok(service.prometheus, 'expects prometheus plugin to be loaded')

    await service.connect()
    assert.ok(service.prometheus, 'expects service is connected with the sentinel config')
  });

  after(() => service.close())

})
