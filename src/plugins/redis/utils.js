// @flow

const Redis = require('ioredis');
const { ArgumentError } = require('common-errors');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('mservice:lua');

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

exports.isStarted = function isStarted(service: Object, RedisType: Function) {
  return () => (
    service._redis && (service._redis instanceof RedisType)
  );
};
