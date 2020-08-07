import { resolve } from 'path'
import { strict as assert } from 'assert'
import { NotFoundError } from 'common-errors'
import {
  PluginTypes,
  Microfleet,
  ValidatorPlugin,
  RedisPlugin,
  PluginInterface,
} from '@microfleet/core'
import * as LockManager from 'dlock'

import type { Redis } from 'ioredis'
import type { LoggerPlugin, Logger } from '@microfleet/plugin-logger'

/**
 * Defines plugin config
 */
export type DLockServiceConfig = {
  pubsubChannel: string;
  lock?: LockConfig;
  lockPrefix: string;
}

export type DLockConfig = {
  client: Redis;
  pubsub: Redis;
  pubsubChannel: string;
  lock: LockConfig;
  lockPrefix: string;
  log: false | Logger;
}

export type LockConfig = {
  timeout?: number;
  retries?: number;
  delay?: number;
}

/**
 * Defines service extension
 */
export interface DLockPlugin {
  dlock: typeof LockManager;
}

/**
 * Plugin name
 */
export const name = 'dlock'

/**
 * Plugin Type
 */
export const type = PluginTypes.database

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 10 // should be after redisCluster, redisSentinel

export const attach = function attachDlockPlugin(
  this: Microfleet & ValidatorPlugin & LoggerPlugin & RedisPlugin & DLockPlugin,
  opts: Partial<DLockConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('log module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError(name, opts) as DLockConfig

  return {
    async connect(this: Microfleet) {
      const { redis: client } = this
      const pubsub = this.redisDuplicate()

      await pubsub.connect()

      this.dlock = new LockManager({
        ...config,
        client,
        pubsub,
        log: this.log,
      })
    },
    async close(this: Microfleet) {
      await this.dlock.pubsub.disconnect()

      this.dlock = null
    },
  }
}
