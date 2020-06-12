import assert = require('assert')
import Bluebird = require('bluebird')
import _debug = require('debug')
import { Microfleet, PluginTypes, ValidatorPlugin, PluginInterface } from '../'
import _require from '../utils/require'
import { ERROR_ALREADY_STARTED, ERROR_NOT_STARTED } from './redis/constants'
import { NotFoundError } from 'common-errors'
import migrate from './redis/migrate'
import { hasConnection, isStarted, loadLuaScripts } from './redis/utils'

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
export function attach(this: Microfleet & ValidatorPlugin, opts: any = {}): PluginInterface {
  const Redis = _require('ioredis')

  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  Redis.Promise = Bluebird
  const isRedisStarted = isStarted(this, Redis)
  const conf = this.validator.ifError('redisSentinel', opts)

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
        const applyInstrumentation = _require('opentracing-js-ioredis')
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
