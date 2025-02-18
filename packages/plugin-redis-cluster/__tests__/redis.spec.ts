import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { resolve } from 'node:path'
import { findHealthCheck } from './utils/health-check'
import { Microfleet } from '@microfleet/core'
import type { Config } from '@microfleet/plugin-redis-cluster'
import { Cluster } from 'ioredis'

let service: Microfleet

const getConfigForRedis = (): Partial<Config> => ({
  hosts: [0, 1, 2].map((idx) => ({
    host: 'redis-cluster',
    port: 7000 + idx,
  })),
  options: {
    keyPrefix: '{host}'
  }
})

test('Redis suite', async (t) => {
  await t.test('able to connect to redis when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'redis-cluster'],
      redis: {
        ...getConfigForRedis(),
        luaScripts: [resolve(__dirname, './fixtures')]
      },
    })

    await service.connect()
    const { redis } = service
    assert(redis instanceof Cluster)
    // @ts-expect-error no index signature for lua functions
    assert(typeof redis['echo-woo'] === 'function')

    const check = findHealthCheck(service, 'redis')
    const result = await check.handler()
    assert(result)
  })

  await t.test('able to perform migrations', async () => {
    await service
      .migrate('redis', '/src/packages/plugin-redis-cluster/__tests__/migrations')

    const version = await service.redis.get('version')
    assert.strictEqual(version, '11')

    const migration_01 = await service.redis.get('migration_01')
    assert.strictEqual(migration_01, 'done')
  })

  await t.test('able to close connection to redis', async () => {
    assert(service)
    await service.close()
  })
})
