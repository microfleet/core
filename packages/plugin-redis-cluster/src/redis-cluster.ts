import { strict as assert } from 'node:assert'
import _debug from 'debug'
import fromEvent from 'promise-toolbox/fromEvent'
import type { PluginInterface } from '@microfleet/core-types'
import type { Microfleet } from '@microfleet/core'
import { Cluster, type ClusterNode, type ClusterOptions } from 'ioredis'
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
    redis: Cluster;
    redisType: 'redisCluster';
  }

  interface ConfigurationOptional {
    redis: Config
  }
}

export interface Config {
  hosts: ClusterNode[]
  options: ClusterOptions & {
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
export async function attach(this: Microfleet, opts: Partial<Config> = {}): Promise<PluginInterface> {
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  await this.validator.addLocation(resolve(__dirname, '../schemas'))

  const isClusterStarted = isStarted(this, Cluster)
  const conf = this.validator.ifError<Config>('redisCluster', opts)

  this.redisType = REDIS_TYPE_CLUSTER
  this.log.debug({ conf }, 'redis config')
  this.redis = new Cluster(conf.hosts, { ...conf.options, lazyConnect: true })

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
