import { strict as assert } from 'node:assert'
import { findHealthCheck } from './utils/health-check'
import { Microfleet } from '@microfleet/core'
import type { Config } from '@microfleet/plugin-redis-cluster'
import { Cluster } from 'ioredis'
import { resolve } from 'path'

describe('Redis suite', function testSuite() {
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

  it('able to connect to redis when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'opentracing', 'logger', 'redis-cluster'],
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

  it('able to perform migrations', async () => {
    await service
      .migrate('redis', '/src/packages/plugin-redis-cluster/__tests__/migrations')

    const version = await service.redis.get('version')
    assert.strictEqual(version, '10')

    const migration_01 = await service.redis.get('migration_01')
    assert.strictEqual(migration_01, 'done')
  })

  it('able to close connection to redis', async () => {
    assert(service)
    await service.close()
  })
})
