import { Microfleet } from '../..';

import assert = require('assert');
import { ArgumentError } from 'common-errors';
import _debug = require('debug');
import fs = require('fs');
import glob = require('glob');
import path = require('path');
import { ERROR_NOT_HEALTHY, ERROR_NOT_STARTED } from './constants';

const debug = _debug('mservice:lua');
/**
 * Loads LUA script and defines it on the redis instance.
 * @param dir - Directory to scan for LUA scripts to load.
 * @param redis - Redis connector instance.
 */
export function loadLuaScripts(this: Microfleet, dir: string, redis: any) {
  if (!path.isAbsolute(dir)) {
    throw new ArgumentError('config.scripts must be an absolute path');
  }

  debug('loading form %s', dir);

  return glob
    .sync('*.lua', { cwd: dir })
    .forEach((scriptName) => {
      const lua = fs.readFileSync(`${dir}/${scriptName}`, 'utf8');
      const name = path.basename(scriptName, '.lua');
      debug('attaching %s', name);
      if (typeof redis[name] === 'undefined') {
        // NOTICE: make sure that you pass number of keys as first arg when supplying function
        redis.defineCommand(name, { lua });
      } else {
        this.log.warn('script %s already defined', name);
      }
    });
}

export function isStarted(service: Microfleet, RedisType: any) {
  return (): boolean => (
    service.redis && (service.redis instanceof RedisType)
  );
}

export async function hasConnection(this: Microfleet, hasRedis: () => any) {
  assert(hasRedis(), ERROR_NOT_STARTED);

  const ping = await this.redis.ping();
  assert(ping, ERROR_NOT_HEALTHY);

  return true;
}
