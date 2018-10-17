// Provides sets of utils for perfoming migrations on redis database
// It's essential to note that this is targeted at a single instance
// In case of cluster one must ensure that you use keyPrefix, which would
// resolve to the same cluster

// 1. accepts array of migration scripts, it must export the following object:
//   -- `final` - denotes version after migration has been completed
//   -- `script` - if `String` would be treated as LUA, otherwise as FN to be executed. One must
//   understand that such function can only bring new data into the system, because
//   this function won't be atomically called, `fn` will be passed current redis pipeline instance
//   to enqueue more actions
//   -- `min` - optional, minimum current version
// 2. prepends lua check which converts script to noop if migration has already been performed
// 3. verified that min/final constraints overlap, except for the very first script
// 4. sends scripts via redis.pipeline()
//
// This essentially blocks master from any writes, because redis is single threaded.
// Assuming we don't really have much work to do this script could do it's job very fast.
// However, in scenarios where migrations are complicated:
//
// * non trivial amounts of data are involved
// * distributed databases
// * ?
//
// One must consider ways to enforce maintenance mode and ensure that no writes would
// be performed on the main database during migration process
//

import { Microfleet } from '../..';

import assert = require('assert');
import Bluebird = require('bluebird');
import _debug = require('debug');
import fs = require('fs');
import glob = require('glob');
import Redis = require('ioredis');
import is = require('is');
import path = require('path');
import sortBy = require('sort-by');

// some constant helpers
const VERSION_KEY = 'version';
const debug = _debug('mservice:redis:migrate');

/**
 * This script is used to verify that we havent performed the transaction yet.
 * @param  finalVersion - This would be set in Redis after update.
 * @param  [min=0] - Minimal version to apply this migration to.
 * @returns Lua script for version verification.
 */
const appendPreScript = (finalVersion: number, min: number = 0) => `-- check for ${finalVersion}
local currentVersion = tonumber(redis.call('get', KEYS[1]) or 0);

if currentVersion >= ${finalVersion} then
  return redis.error_reply('migration already performed');
end

if currentVersion < ${min} then
  return redis.error_reply('min version constraint failed');
end
-- end check`;

/**
 * This script is used to put version after migration is complete.
 * @param finalVersion - This Would be set in redis after update.
 * @returns Lua post-verification script.
 */
const appendPostScript = (finalVersion: number) => `-- set current version
return redis.call('set', KEYS[1], '${finalVersion}');
`;

/**
 * This is the most common case of a single LUA script for migration.
 * @param  finalVersion - Sets version after upgrade.
 * @param  [min=0] - Minimal version to apple migration to.
 * @param  script - Userland LUA script.
 * @returns Final Lua script.
 */
const appendLuaScript = (finalVersion: number, min: number = 0, script: string) => [
  appendPreScript(finalVersion, min),
  script,
  appendPostScript(finalVersion),
].join('\n');

export interface IMigration {
  final: number;
  min: number;
  args: any[];
  script: any;
  keys?: string[];
}

/**
 * Verifies current Redis schema version.
 * @param  error - Any error.
 * @returns Swallows certain error messages.
 */
function checkVersionError(this: Microfleet, error: any) {
  this.log.error(error);

  if (error.message === 'migration already performed') {
    return;
  }

  throw error;
}

/**
 * Perform migrations on the Redis database.
 * @param  redis - Redis client.
 * @param  service - Mservice instance.
 * @param  scripts - Migrations to perform.
 * @returns Returns when migrations are performed.
 */
async function performMigration(redis: Redis.Redis, service: Microfleet, scripts: any) {
  let files: IMigration[];
  if (is.string(scripts)) {
    debug('looking for files in %s', scripts);
    files = glob.sync('*{.js,/}', { cwd: scripts })
      .map((script) => require(`${scripts}/${script}`)); // eslint-disable-line import/no-dynamic-require
  } else if (is.array(scripts)) {
    files = scripts;
  } else {
    throw new Error('`scripts` arg must be either a directory with migrations or Migrations[]');
  }

  if (files.length === 0) {
    debug('no files found');
    return undefined;
  }

  // sort in order of execution
  files.sort(sortBy('final', 'min'));

  // fetch current version and then remove unneeded migrations
  const savedVersion = await redis.get(VERSION_KEY);
  const currentVersion = parseInt(savedVersion || '0', 10);

  // ensure that all files have final > currentVersion
  files = files.filter((file) => file.final > currentVersion);

  if (files.length === 0) {
    debug('no files found');
    return undefined;
  }

  for (const file of files) {
    const { final } = file;
    assert(is.integer(+final), 'final version must be present and be an integer');

    if (is.string(file.script)) {
      // read file contents
      if (path.isAbsolute(file.script)) {
        file.script = fs.readFileSync(file.script, 'utf8');
      }

      // finalize content
      const script = appendLuaScript(final, file.min, file.script);
      const keys = [VERSION_KEY].concat(file.keys || []);
      const { args } = file;

      debug('evaluating script after %s', currentVersion, script);

      try {
        // eslint-disable-next-line no-await-in-loop
        await redis.eval(script, keys.length, keys, args);
      } catch (error) {
        checkVersionError.call(service, error);
      }
    } else if (is.fn(file.script)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await redis.eval(appendPreScript(final, file.min), 1, [VERSION_KEY]);
        // must return promise
        // eslint-disable-next-line no-await-in-loop
        await file.script(service);
        // eslint-disable-next-line no-await-in-loop
        await redis.eval(appendPostScript(final), 1, [VERSION_KEY]);
      } catch (error) {
        checkVersionError.call(service, error);
      }
    } else {
      throw new Error('script must be a function if not a string');
    }
  }

  return true;
}

export default performMigration;
