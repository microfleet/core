import { strict as assert } from 'assert'
import { Microfleet } from '@microfleet/core'
import Bluebird = require('bluebird')

describe('@microfleet/plugin-dlock + cluster', () => {
  let microfleet: Microfleet

  it('should be able to initialize dlock with redis cluster', async () => {
    microfleet = new Microfleet({
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
  })

  it('microfleet connects', async () => {
    await microfleet.connect()
    assert(microfleet.dlock)
  })

  it('able to acquire lock', async () => {
    await Bluebird.using(microfleet.dlock.acquireLock('single lock'), async (lock) => {
      microfleet.log.info('lock acquired')
      lock.extend()
    })
  })

  it('able to acquire multi-lock', async () => {
    await Bluebird.using(microfleet.dlock.acquireLock('single lock', 'second key'), async (lock) => {
      microfleet.log.info('lock acquired')
      lock.extend()
    })
  })

  afterAll(async () => {
    if (microfleet) await microfleet.close()
  })
})
