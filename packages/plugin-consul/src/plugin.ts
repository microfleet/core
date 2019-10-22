import { once } from 'events'
import { resolve } from 'path'
import { strict as assert } from 'assert'
import { NotFoundError } from 'common-errors'
import { PluginTypes, Microfleet, PluginInterface, ValidatorPlugin, LoggerPlugin } from '@microfleet/core'
import consul = require('consul')

/**
 * Consul configuration
 * https://www.npmjs.com/package/consul#init
 */
export type ConsulConfig = {
  base: consul.ConsulOptions;
  lock: Partial<consul.Lock.Options>;
}

/**
 * Plugin name
 */
export const name = 'consul'

/**
 * Defines service extension
 */
export interface ConsulPlugin {
  consul: consul.Consul
  consulLeader: consul.Lock
  whenLeader(): Promise<boolean>
}

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
 * Provides `validate` and `validateSync` methods.
 * @param conf - Validator Configuration Object.
 * @param parentFile - From which file this plugin was invoked.
 */
export const attach = function attachValidator(
  this: Microfleet & ValidatorPlugin & LoggerPlugin & ConsulPlugin,
  opts: Partial<ConsulConfig> = {}
): PluginInterface {
  const service = this

  assert(service.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(service.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  service.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = service.ifError(name, opts) as ConsulConfig
  const base = { ...config.base, promisify: true }
  const lockConfig = {
    key: `microfleet/${service.config.name}/leader`,
    ...config.lock,
  }
  const { key } = lockConfig

  // expand core service
  let isLeader = false
  const instance = service[name] = consul(base)
  const consulLeader = service.consulLeader = instance.lock(lockConfig)
  service.whenLeader = async () => {
    if (isLeader) {
      return true
    }

    await Promise.race([
      once(consulLeader, 'acquire'),
      once(service as any, 'close'),
    ])

    return isLeader
  }

  const onAcquire = (data?: any) => {
    if (data && data.reemit === true) {
      this.log.warn({ data }, 'skipping reemit')
      return
    }

    isLeader = true
    service.log.info({ key, leader: true }, 'acquired leader')
    service.emit('leader', key)
  }

  const onRelease = () => {
    isLeader = false
    service.log.info({ key, leader: false }, 'gracefully released')
  }

  const onEnd = () => {
    isLeader = false
    service.log.info({ key, leader: false }, 'lost leader')
    service.emit('follower', key)
    service.consulLeader.acquire()
  }

  const onNewListener = (event: string) => {
    service.log.info({ event }, 'adding new listener')

    if (event !== 'acquire' || !isLeader) {
      return
    }

    process.nextTick(() => {
      service.consulLeader.emit('acquire', { reemit: true })
    })
  }

  return {
    async connect() {
      consulLeader.on('acquire', onAcquire)
      consulLeader.on('release', onRelease)
      consulLeader.on('end', onEnd)
      consulLeader.on('newListener', onNewListener)
      consulLeader.acquire()
    },

    async close() {
      service.consulLeader.removeListener('acquire', onAcquire)
      service.consulLeader.removeListener('release', onRelease)
      service.consulLeader.removeListener('end', onEnd)
      service.consulLeader.removeListener('newListener', onNewListener)
      service.consulLeader.release()
      await once(service.consulLeader, 'end')
    },
  }
}
