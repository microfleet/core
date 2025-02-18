import type * as _ from '@microfleet/plugin-validator'
import { strict as assert } from 'node:assert'
import _debug from 'debug'
import type { PluginInterface } from '@microfleet/core-types'
import type { Microfleet } from '@microfleet/core'
import { PluginTypes } from '@microfleet/utils'
import { NotFoundError } from 'common-errors'
import { resolve } from 'path'
import {
  REDIS_TYPE_SENTINEL,
  performMigration,
  hasConnection,
  isStarted,
  loadLuaScripts,
} from '@microfleet/plugin-redis-core'
import { Redis, RedisOptions } from 'ioredis'

const debug = _debug('mservice:redisSentinel')

declare module '@microfleet/core-types' {
  interface Microfleet {
    redis: Redis;
    redisType: 'redisSentinel';
  }

  interface ConfigurationOptional {
    redis: Config
  }
}

export interface Config {
  name: string
  sentinels: RedisOptions['sentinels']
  options: Omit<RedisOptions, 'sentinels'>
  luaScripts: string | string[]
}

/**
 * Plugin name.
 */
export const name = 'redis'

/**
 * Plugin type.
 */
export const type = PluginTypes.database

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 10

/**
 * Attaches Redis Sentinel plugin.
 * @param  [conf={}] - Configuration for Redis Sentinel Connection.
 * @returns Connections and Destructors.
 */
export async function attach(this: Microfleet, opts: Partial<Config> = {}): Promise<PluginInterface> {
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  await this.validator.addLocation(resolve(__dirname, '../schemas'))

  const isRedisStarted = isStarted(this, Redis)
  const conf = this.validator.ifError<Config>('redisSentinel', opts)

  this.redisType = REDIS_TYPE_SENTINEL
  this.redis = new Redis({
    ...conf.options,
    lazyConnect: true,
    name: conf.name,
    sentinels: conf.sentinels,
  })

  return {

    /**
     * @private
     * @returns Opens connection to Redis.
     */
    async connect(this: Microfleet) {
      this.log.debug('redis connecting')
      await this.redis.connect()
      this.log.debug('redis connected')

      // attach to this.redis right away
      if (conf.luaScripts) {
        debug('attaching lua')
        await loadLuaScripts(this, conf.luaScripts, this.redis)
      }

      this.addMigrator('redis', performMigration, this.redis, this)
      this.emit('plugin:connect:redisSentinel', this.redis)

      return this.redis
    },

    /**
     * @returns Returns current status of redis sentinel.
     */
    status: hasConnection.bind(this, isRedisStarted),

    /**
     * @returns Closes redis connection.
     */
    async close(this: Microfleet) {
      try {
        await this.redis.quit()
      } catch (e: any) {
        if (e.message === 'Connection is closed.') {
          return
        }

        throw e
      }

      this.emit('plugin:close:redisSentinel')
    },
  }
}
