import { once } from 'events'
import { resolve } from 'path'
import { strict as assert } from 'assert'
import type { PluginInterface } from '@microfleet/core-types'
import { Microfleet } from '@microfleet/core'
import { NotFoundError } from 'common-errors'
import { PluginTypes } from '@microfleet/utils'
import consul from 'consul'
import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-logger'

/**
 * Consul configuration
 * https://www.npmjs.com/package/consul#init
 */
export type ConsulConfig = {
  base: consul.ConsulOptions;
  lock: Partial<consul.Lock.Options>;
  lockRetry: BackoffConfig;
}

type BackoffConfig = {
  min: number,
  max: number,
  factor: number,
}

declare module '@microfleet/core-types' {
  interface Microfleet {
    consul: consul.Consul;
    consulLeader: consul.Lock;
    whenLeader(): Promise<boolean>;
  }

  interface ConfigurationOptional {
    consul: ConsulConfig
  }
}

/**
 * Plugin name
 */
export const name = 'consul'

/**
 * Plugin Type
 */
export const type = PluginTypes.database

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0

/**
 * Attaches initialized validator based on conf.
 * Provides `consul` and `consulLeader` methods.
 * @param opts - Consul Configuration Object.
 */
export const attach = function attachConsulPlugin(
  this: Microfleet,
  opts: Partial<ConsulConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError<ConsulConfig>(name, opts)
  const base = { ...config.base, promisify: true }
  const lockConfig = {
    key: `microfleet/${this.config.name}/leader`,
    ...config.lock,
  }

  const { key } = lockConfig

  let reconnectCount = 0
  const reconnectTimeout = () => {
    const { max, min, factor } = config.lockRetry
    if (reconnectCount === 0) return 0
    if (reconnectCount === 1) return min
    return Math.min(Math.round((Math.random() + 1) * min * Math.pow(factor, reconnectCount - 1)), max)
  }

  // expand core service
  let isLeader = false
  const instance = this[name] = consul(base)
  this.consulLeader = instance.lock(lockConfig)

  this.whenLeader = async () => {
    if (isLeader) {
      return true
    }

    await Promise.race([
      once(this.consulLeader, 'acquire'),
      // force all Promises that wait for lock to resolve with false
      once(this, 'close').then(() => { isLeader = false }),
    ])

    return isLeader
  }

  const onAcquire = (data?: any) => {
    if (data && data.reemit === true) {
      this.log.warn({ data }, 'skipping reemit')
      return
    }

    isLeader = true
    this.log.info({ key, leader: true }, 'acquired leader')
    this.emit('leader', key)
  }

  const onRelease = () => {
    isLeader = false
    this.log.info({ key, leader: false }, 'gracefully released')
  }

  const onEnd = () => {
    isLeader = false
    this.log.info({ key, leader: false }, 'lost leader')
    this.emit('follower', key)

    setTimeout(() => {
      reconnectCount += 1
      this.consulLeader.acquire()
    }, reconnectTimeout()).unref()
  }

  const onNewListener = (event: string) => {
    this.log.info({ event }, 'adding new listener')

    if (event !== 'acquire' || !isLeader) {
      return
    }

    process.nextTick(() => {
      this.consulLeader.emit('acquire', { reemit: true })
    })
  }

  const onError = (err: Error, res: any) => {
    this.log.info({ err, res }, 'consul lock error')
    this.emit('consul.lock.error', err, res)
  }

  const onRetry = (info: any) => {
    this.log.info({ info }, 'consul lock retry')
    this.emit('consul.lock.retry', info)
  }

  return {
    async connect(this: Microfleet) {
      this.consulLeader.on('acquire', onAcquire)
      this.consulLeader.on('release', onRelease)
      this.consulLeader.on('end', onEnd)
      this.consulLeader.on('error', onError)
      this.consulLeader.on('retry', onRetry)
      this.consulLeader.on('newListener', onNewListener)
      this.consulLeader.acquire()
    },

    async close(this: Microfleet) {
      this.consulLeader.removeListener('acquire', onAcquire)
      this.consulLeader.removeListener('release', onRelease)
      this.consulLeader.removeListener('retry', onRetry)
      this.consulLeader.removeListener('newListener', onNewListener)
      this.consulLeader.removeListener('end', onEnd)

      this.consulLeader.release()
      await once(this.consulLeader, 'end')

      this.consulLeader.removeListener('error', onError)
    },
  }
}
