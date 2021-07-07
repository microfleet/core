import type { Microfleet } from '@microfleet/core-types'
import type * as _ from '@microfleet/plugin-logger'
import { promisify } from 'util'
import { strict as assert } from 'assert'
import { ArgumentError } from 'common-errors'
import _debug = require('debug')
import fs = require('fs')
import _glob = require('glob')
import path = require('path')
import { ERROR_NOT_HEALTHY, ERROR_NOT_STARTED } from './constants'
import Redis = require('ioredis')

const debug = _debug('mservice:lua')
const glob = promisify(_glob)
const readFile = promisify(fs.readFile)

/**
 * Loads LUA script and defines it on the redis instance.
 * @param dir - Directory to scan for LUA scripts to load.
 * @param redis - Redis connector instance.
 */
export async function loadLuaScripts<T extends Redis.Redis | Redis.Cluster>(
  ctx: Microfleet,
  dir: string | string[],
  redis: T
): Promise<void> {
  // NOTE: this is a concious decision to use await serially
  // so that it's easier to debug
  // Operations that happen here are a one-off during script startup
  // process and gains from reading files in parallel IMO aren't
  // worth extra complexity

  const locations = Array.isArray(dir) ? dir : [dir]

  for (const location of locations) {
    if (!path.isAbsolute(location)) {
      throw new ArgumentError('config.scripts must be an absolute path')
    }

    debug('loading from %s', location)

    const scripts = await glob('*.lua', { cwd: location })
    for (const scriptName of scripts) {
      const lua = await readFile(`${location}/${scriptName}`, 'utf8')
      const name = path.basename(scriptName, '.lua')
      debug('attaching %s', name)
      // @ts-expect-error incomplete mapping
      if (typeof redis[name] === 'undefined') {
        // NOTICE: make sure that you pass number of keys as first arg when supplying function
        redis.defineCommand(name, { lua })
      } else {
        ctx.log.warn('script %s already defined', name)
      }
    }
  }
}

export function isStarted<T extends Redis.ClusterStatic | typeof Redis>(service: Microfleet, RedisType: T) {
  return (): boolean => (
    service.redis && (service.redis instanceof RedisType)
  )
}

export async function hasConnection(this: Microfleet, hasRedis: () => boolean): Promise<boolean> {
  assert(hasRedis(), ERROR_NOT_STARTED)

  const ping = await this.redis.ping()
  assert(ping, ERROR_NOT_HEALTHY)

  return true
}
