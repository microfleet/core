// @flow
import typeof Mservice from '../../index';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const assert = require('assert');
const Redis = require('@makeomatic/ioredis');
const debug = require('debug')('mservice:lua');

const { ArgumentError } = require('common-errors');

const { ERROR_NOT_STARTED, ERROR_NOT_HEALTHY } = require('./constants');

/**
 * Loads LUA script and defines it on the redis instance.
 * @param {string} dir - Directory to scan for LUA scripts to load.
 * @param {Redis} redis - Redis connector instance.
 */
exports.loadLuaScripts = function loadLuaScripts(dir: string, redis: Redis) {
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
        // eslint-disable-next-line no-console
        console.warn('script %s already defined', name);
      }
    });
};

exports.isStarted = function isStarted(service: Mservice, RedisType: Redis | Redis.Cluster): Function {
  return (): boolean => (
    service._redis && (service._redis instanceof RedisType)
  );
};

exports.hasConnection = async function hasConnection(hasRedis: () => mixed) {
  assert(hasRedis(), ERROR_NOT_STARTED);

  const ping = await this._redis.ping();
  assert(ping, ERROR_NOT_HEALTHY);

  return true;
};
