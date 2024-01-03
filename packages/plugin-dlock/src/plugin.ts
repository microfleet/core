import Bluebird from 'bluebird'
import Redis, { Cluster } from 'ioredis'
import type * as __ from '@microfleet/plugin-logger'
import type * as _ from '@microfleet/plugin-validator'

import { resolve } from 'path'
import { strict as assert } from 'assert'
import { NotFoundError, HttpStatusError } from 'common-errors'
import { Microfleet, PluginInterface } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'
import { DistributedCallbackQueue, Config, MultiLock, MultiLockError } from '@microfleet/dlock'
import { Lock, LockAcquisitionError } from '@microfleet/ioredis-lock'
export { default as actionLockWrapper } from './utils/lock-action-wrapper'
export interface DLockPlugin {
  manager: DistributedCallbackQueue;
  acquireLock(...keys: string[]): Bluebird.Disposer<Lock | MultiLock>;
}

declare module '@microfleet/core-types' {
  export interface Microfleet {
    dlock: DLockPlugin;
  }

  export interface ConfigurationOptional {
    dlock: Config;
  }
}

/**
 * Defines plugin config
 */
export { Config }

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
export const priority = 30 // should be after redisCluster, redisSentinel

export { LockAcquisitionError }

const kConcurrentAccess = new HttpStatusError(409, 'concurrent access to a locked resource, try again in a few seconds')

function acquireLock(this: Microfleet, key: string): Bluebird.Disposer<Lock>
function acquireLock(this: Microfleet, key: string, ...keys: string[]): Bluebird.Disposer<MultiLock>
function acquireLock(this: Microfleet, ...keys: string[]): Bluebird.Disposer<Lock | MultiLock> {
  const { dlock, log } = this

  assert(dlock, 'DLock plugin is not initialized yet')

  try {
    let lockPromise: Promise<Lock> | Promise<MultiLock>

    if (keys.length === 1) {
      lockPromise = dlock.manager.once(keys[0])
    } else {
      lockPromise = dlock.manager.multi(keys)
    }

    return Bluebird.resolve<Lock | MultiLock>(lockPromise).disposer(async (lock) => {
      try {
        await lock.release()
      } catch (err) {
        log.error({ err, keys }, 'failed to release lock')
      }
    })
  } catch (error) {
    if (error instanceof MultiLockError) {
      log.warn({ keys }, 'failed to lock')
      throw kConcurrentAccess
    }

    throw error
  }
}

export const attach = async function attachDlockPlugin(
  this: Microfleet,
  opts: Partial<Config> = {}
): Promise<PluginInterface> {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('redis'), new NotFoundError('`redis-cluster` or `redis-sentinel` module must be included'))

  // load local schemas
  await this.validator.addLocation(resolve(__dirname, '../schemas'))
  const config = this.validator.ifError<Config>(name, opts)

  return {
    async connect(this: Microfleet) {
      const { redis } = this
      assert(redis instanceof Redis || redis instanceof Cluster)

      // have separate clients specific to pubsub, this is a little extra load
      // but ultimately wont account to much and we get complete control
      // of these clients

      this.dlock = {
        manager: new DistributedCallbackQueue({
          ...config,
          client: redis.duplicate(),
          pubsub: redis.duplicate(),
          log: this.log,
        }),
        acquireLock: acquireLock.bind(this),
      }

      await this.dlock.manager.connect()
    },

    async close(this: Microfleet) {
      await this.dlock.manager.close()
    },
  }
}
