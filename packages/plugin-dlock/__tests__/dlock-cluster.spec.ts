import { strict as assert } from 'assert'
import { Microfleet } from '@microfleet/core'
import Bluebird from 'bluebird'

describe('@microfleet/plugin-dlock + cluster', () => {
  let microfleet: Microfleet

  beforeAll(async () => {
    microfleet = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'redis-cluster', 'dlock'],
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
