import assert = require('assert')
import Bluebird = require('bluebird')
import _debug = require('debug')
import is = require('is')
import { Microfleet, PluginTypes } from '../'
import _require from '../utils/require'
import { ERROR_ALREADY_STARTED, ERROR_NOT_STARTED } from './redis/constants'
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
 * Attaches Redis Sentinel plugin.
 * @param  [conf={}] - Configuration for Redis Sentinel Connection.
 * @returns Connections and Destructors.
 */
export function attach(this: Microfleet, conf: any = {}) {
  const service = this
  const Redis = _require('ioredis')
  Redis.Promise = Bluebird

  const isRedisStarted = isStarted(service, Redis)

  // optional validation with the plugin
  if (is.fn(service.ifError)) {
    service.ifError('redisSentinel', conf)
  }

  debug('loading with config', conf)

  return {

    /**
     * @private
     * @returns Opens connection to Redis.
     */
    async connect() {
      assert(service.redis == null, ERROR_ALREADY_STARTED)

      const instance = new Redis({
        lazyConnect: true,
        name: conf.name,
        sentinels: conf.sentinels,
        ...conf.options,
      })

      if (service.tracer) {
        const applyInstrumentation = _require('opentracing-js-ioredis')
        applyInstrumentation(service.tracer, instance)
      }

      // attach to instance right away
      if (conf.luaScripts) {
        debug('attaching lua')
        loadLuaScripts.call(service, conf.luaScripts, instance)
      }

      await instance.connect()

      service.addMigrator('redis', migrate, instance, service)
      service.redis = instance
      service.emit('plugin:connect:redisSentinel', instance)

      return instance
    },

    /**
     * @returns Returns current status of redis sentinel.
     */
    status: hasConnection.bind(service, isRedisStarted),

    /**
     * @returns Closes redis connection.
     */
    async close() {
      assert(isRedisStarted(), ERROR_NOT_STARTED)

      await service.redis
        .quit()
        .catchReturn({ message: 'Connection is closed.' }, null)

      service.redis = null
      service.emit('plugin:close:redisSentinel')
    },

  }
}
