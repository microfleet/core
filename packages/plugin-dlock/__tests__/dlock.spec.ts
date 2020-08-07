import { strict as assert } from 'assert'
import { Microfleet } from '@microfleet/core'

describe('@microfleet/plugin-dlock', () => {
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

    assert.ok(microfleet.dlock)

    await microfleet.close()
  })

  it('should be able to initialize dlock with redis sentinel', async () => {
    const microfleet = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'redisSentinel', 'dlock'],
      redis: {
        name: 'mservice',
        sentinels: [
          { host: 'redis-sentinel', port: 26379 },
        ],
      },
      dlock: {
        pubsubChannel: 'test-dlock',
        lockPrefix: 'perchik',
      },
    })

    await microfleet.connect()

    assert.ok(microfleet.dlock)

    await microfleet.close()
  })
})
