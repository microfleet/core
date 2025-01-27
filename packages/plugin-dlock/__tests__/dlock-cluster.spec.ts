import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Microfleet } from '@microfleet/core'
import Bluebird from 'bluebird'

test('@microfleet/plugin-dlock + cluster', async (t) => {
  let microfleet: Microfleet

  t.before(async () => {
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

  t.after(async () => {
    if (microfleet) await microfleet.close()
  })

  await t.test('microfleet connects', async () => {
    await microfleet.connect()
    assert(microfleet.dlock)
  })

  await t.test('able to acquire lock', async () => {
    await Bluebird.using(microfleet.dlock.acquireLock('single lock'), async (lock) => {
      microfleet.log.info('lock acquired')
      lock.extend()
    })
  })

  await t.test('able to acquire multi-lock', async () => {
    await Bluebird.using(microfleet.dlock.acquireLock('single lock', 'second key'), async (lock) => {
      microfleet.log.info('lock acquired')
      lock.extend()
    })
  })
})
