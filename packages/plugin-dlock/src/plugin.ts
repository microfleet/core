import { resolve } from 'path'
import { strict as assert } from 'assert'
import { NotFoundError, HttpStatusError } from 'common-errors'
import {
  PluginTypes,
  Microfleet,
  ValidatorPlugin,
  PluginInterface,
  RedisPlugin,
} from '@microfleet/core'
import * as LockManager from 'dlock'
import { LockAcquisitionError } from 'ioredis-lock'

import '@microfleet/plugin-logger'

import type Bluebird from 'bluebird'
import type { Redis } from 'ioredis'
import type { Logger } from '@microfleet/plugin-logger'

export interface DLockPlugin {
  manager: typeof LockManager;
  acquireLock(...keys: string[]): Promise<IORedisLock>;
}

declare module '@microfleet/core' {
  export interface Microfleet {
    dlock: DLockPlugin | null;
  }

  export interface ConfigurationOptional {
    dlock: DLockPluginConfig;
  }
}

/**
 * Defines plugin config
 */
export type DLockPluginConfig = {
  pubsubChannel: string;
  lock?: LockConfig;
  lockPrefix: string;
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

export { LockAcquisitionError }

async function acquireLock(this: Microfleet, ...keys: string[]): Promise<IORedisLock> {
  const { dlock, log } = this

  assert(dlock, 'DLock plugin is not initialized yet')

  try {
    let lockPromise: Bluebird<IORedisLock>

    if (keys.length === 1) {
      lockPromise = dlock.manager.once(keys[0])
    } else {
      lockPromise = dlock.manager.multi(keys)
    }

    lockPromise.disposer(async (lock: IORedisLock) => {
      try {
        await lock.release()
      } catch (error) {
        log.error({ error }, 'failed to release lock for', keys)
      }
    })

    return lockPromise
  } catch (error) {
    if (error instanceof LockManager.MultiLockError) {
      log.warn('failed to lock: %j', keys)

      throw new HttpStatusError(
        409,
        'concurrent access to a locked resource, try again in a few seconds'
      )
    }

    throw error
  }
}

export const attach = function attachDlockPlugin(
  this: Microfleet & ValidatorPlugin & RedisPlugin,
  opts: Partial<DLockPluginConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('log module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError(name, opts) as DLockPluginConfig

  return {
    async connect(this: Microfleet & RedisPlugin) {
      const { redis: client } = this
      const pubsub = this.redisDuplicate()

      await pubsub.connect()

      this.dlock = {
       manager: new LockManager({
          ...config,
          client,
          pubsub,
          log: this.log,
        }),
        acquireLock: acquireLock.bind(this),
      }
    },
    async close(this: Microfleet) {
      if (this.dlock) {
        await this.dlock.manager.pubsub.disconnect()
      }

      this.dlock = null
    },
  }
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

export interface IORedisLock {
  acquire(key: string): Promise<void>;
  release(): Promise<void>;
  extend(time?: number): Promise<void>;
}
