import { strict as assert } from 'assert'
import { Microfleet } from '@microfleet/core'

describe('@microfleet/plugin-dlock + sentinel', () => {
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
    assert(microfleet.dlock)
    await microfleet.close()
  })
})
