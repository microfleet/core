import assert = require('assert')
import Bluebird = require('bluebird')
import _debug = require('debug')
import type { Microfleet, PluginInterface } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'
import { RedisPlugin } from './redis/types'
import { ERROR_ALREADY_STARTED, ERROR_NOT_STARTED, REDIS_TYPE_SENTINEL } from './redis/constants'
import { NotFoundError } from 'common-errors'
import migrate from './redis/migrate'
import { hasConnection, isStarted, loadLuaScripts } from './redis/utils'
import Redis = require('ioredis')

const debug = _debug('mservice:redisSentinel')

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
export const priority = 0

/**
 * Attaches Redis Sentinel plugin.
 * @param  [conf={}] - Configuration for Redis Sentinel Connection.
 * @returns Connections and Destructors.
 */
export function attach(this: Microfleet & RedisPlugin, opts: any = {}): PluginInterface {
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // @ts-expect-error - promise not defined, but can be used
  Redis.Promise = Bluebird
  const isRedisStarted = isStarted(this, Redis)
  const conf = this.validator.ifError('redisSentinel', opts)

  this.redisType = REDIS_TYPE_SENTINEL

  return {

    /**
     * @private
     * @returns Opens connection to Redis.
     */
    async connect(this: Microfleet) {
      assert(this.redis == null, ERROR_ALREADY_STARTED)

      const instance = new Redis({
        lazyConnect: true,
        name: conf.name,
        sentinels: conf.sentinels,
        ...conf.options,
      })

      if (this.tracer) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const applyInstrumentation = require('opentracing-js-ioredis')
        applyInstrumentation(this.tracer, instance)
      }

      // attach to instance right away
      if (conf.luaScripts) {
        debug('attaching lua')
        await loadLuaScripts(this, conf.luaScripts, instance)
      }

      await instance.connect()

      this.addMigrator('redis', migrate, instance, this)
      this.redis = instance
      this.redisDuplicate = () => instance.duplicate()
      this.emit('plugin:connect:redisSentinel', instance)

      return instance
    },

    /**
     * @returns Returns current status of redis sentinel.
     */
    status: hasConnection.bind(this, isRedisStarted),

    /**
     * @returns Closes redis connection.
     */
    async close(this: Microfleet) {
      assert(isRedisStarted(), ERROR_NOT_STARTED)

      await this.redis
        .quit()
        .catchReturn({ message: 'Connection is closed.' }, null)

      this.redis = null
      this.emit('plugin:close:redisSentinel')
    },

  }
}
