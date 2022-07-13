import { strict as assert } from 'node:assert'
import Bluebird = require('bluebird')
import _debug = require('debug')
import fromEvent = require('promise-toolbox/fromEvent')
import type { PluginInterface } from '@microfleet/core-types'
import type { Microfleet } from '@microfleet/core'
import Redis from 'ioredis'
import { resolve } from 'path'
import { PluginTypes } from '@microfleet/utils'
import { NotFoundError } from 'common-errors'
import {
  hasConnection,
  isStarted,
  loadLuaScripts,
  performMigration,
  ERROR_NOT_STARTED,
  REDIS_TYPE_CLUSTER
} from '@microfleet/plugin-redis-core'

import * as _ from '@microfleet/plugin-validator'

const debug = _debug('mservice:redisCluster')

declare module '@microfleet/core-types' {
  interface Microfleet {
    redis: Redis.Cluster;
    redisType: 'redisCluster';
  }

  interface ConfigurationOptional {
    redis: Config
  }
}

export interface Config {
  hosts: Redis.ClusterNode[]
  options: Redis.ClusterOptions & {
    keyPrefix?: string
  }
  luaScripts: string | string[]
}

/**
 * Plugin name
 */
export const name = 'redis'

/**
 * Plugin type
 */
export const type = PluginTypes.database

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 10

/**
 * Attaches Redis Cluster plugin.
 * @param  [conf={}] - Configuration for Redis Cluster Connection.
 * @returns Connections and Destructors.
 */
export function attach(this: Microfleet, opts: Partial<Config> = {}): PluginInterface {
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const bird = Bluebird.getNewLibraryCopy()
  bird.config({
    cancellation: true,
  })

  // push out its own bluebird version and configure cancellation
  // @ts-expect-error not defined in protos
  Redis.Promise = bird

  const { Cluster } = Redis
  const isClusterStarted = isStarted(this, Cluster)
  const conf = this.validator.ifError<Config>('redisCluster', opts)

  this.redisType = REDIS_TYPE_CLUSTER
  this.log.debug({ conf }, 'redis config')
  this.redis = new Cluster(conf.hosts, { ...conf.options, lazyConnect: true })

  if (this.tracer) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const applyInstrumentation = require('opentracing-js-ioredis')
    applyInstrumentation(this.tracer, this.redis)
  }

  return {

    /**
     * @returns Opens redis connection.
     */
    async connect(this: Microfleet) {
      const $conn = this.redis.connect()
      const $ready = fromEvent(this.redis, 'ready', { ignoreErrors: true })

      await Promise.race([$conn, $ready])

      // attach to instance right away
      if (conf.luaScripts) {
        debug('attaching lua')
        await loadLuaScripts(this, conf.luaScripts, this.redis)
      }

      this.addMigrator('redis', performMigration, this.redis, this)
      this.emit('plugin:connect:redisCluster', this.redis)

      return this.redis
    },

    /**
     * @returns Returns current status of redis cluster.
     */
    status: hasConnection.bind(this, isClusterStarted),

    /**
     * @returns Closes redis connection.
     */
    async close(this: Microfleet) {
      assert(isClusterStarted(), ERROR_NOT_STARTED)

      try {
        await this.redis.quit()
      } catch (e: any) {
        if (e.message === 'Connection is closed.') {
          return
        }

        throw e
      }

      this.emit('plugin:close:redisCluster')
    },
  }
}
