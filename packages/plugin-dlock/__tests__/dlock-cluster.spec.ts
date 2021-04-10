import { strict as assert } from 'assert'
import { Microfleet } from '@microfleet/core'

describe('@microfleet/plugin-dlock + cluster', () => {
  it('should be able to initialize dlock with redis cluster', async () => {
    const microfleet = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'redisCluster', 'dlock'],
      redis: {
        hosts: [
          { host: 'redis-cluster', port: 7000 },
          { host: 'redis-cluster', port: 7001 },
          { host: 'redis-cluster', port: 7002 },
        ],
      },
      dlock: {
        pubsubChannel: 'test-dlock',
        lockPrefix: 'perchik',
      },
    })

    await microfleet.connect()
    assert(microfleet.dlock)
    await microfleet.close()
  })
})
