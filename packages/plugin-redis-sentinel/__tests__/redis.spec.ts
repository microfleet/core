import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import { resolve } from 'node:path'
import { findHealthCheck } from './utils/health-check'
import { Microfleet } from '@microfleet/core'
import type { Config } from '@microfleet/plugin-redis-sentinel'
import Redis from 'ioredis'

describe('Redis suite', async () => {
  let service: Microfleet

  const getConfigForRedis = (): Partial<Config> => ({
    sentinels: [
      {
        host: 'redis-sentinel',
        port: 26379,
      },
    ],
    name: 'mservice',
    options: {},
  })

  it('able to connect to redis sentinel when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'redisSentinel'],
      redis: {
        ...getConfigForRedis(),
        luaScripts: [resolve(__dirname, './fixtures')],
      },
    })

    await service.connect()
    const { redis } = service

    assert(redis instanceof Redis)
    // @ts-expect-error no index signature for custom functions
    assert(typeof redis['echo-woo'] === 'function')
    assert.doesNotThrow(() => service.redis)

    const check = findHealthCheck(service, 'redis')
    const result = await check.handler()
    assert(result)
  })

  it('able to perform migrations', async () => {
    await service
      .migrate('redis', '/src/packages/plugin-redis-sentinel/__tests__/migrations')

    const version = await service.redis.get('version')
    assert.strictEqual(version, '11')

    const migration_01 = await service.redis.get('migration_01')
    assert.strictEqual(migration_01, 'done')
  })

  it('able to close connection to redis', async () => {
    assert(service)
    await service.close()
  })
})
