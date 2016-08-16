'use strict';

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _bluebird = require('bluebird');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

const Promise = require('bluebird');
const assert = require('assert');
const glob = require('glob');
const is = require('is');
const sortBy = require('sort-by');
const path = require('path');
const fs = require('fs');
const debug = require('debug')('mservice:redis:migrate');

// some constant helpers
const VERSION_KEY = 'version';
const appendLuaScript = (finalVersion, min = 0, script) => `-- check for ${ finalVersion }
local versionKey = KEYS[1];
local currentVersion = tonumber(redis.call('get', versionKey) or 0);
if currentVersion >= ${ finalVersion } then
  return nil;
end

if currentVersion < ${ min } then
  return redis.reply_error('min version constraint failed');
end
-- end check
${ script }
-- set current version
return redis.call('set', versionKey, '${ finalVersion }');
`;

module.exports = (() => {
  var _ref = (0, _bluebird.coroutine)(function* (redis, scripts) {
    let files;
    if (is.string(scripts)) {
      debug('looking for files in %s', scripts);
      files = glob.sync('*{.js,/}', { cwd: scripts }).map(function (script) {
        return require(`${ scripts }/${ script }`);
      });
    } else if (is.array(scripts)) {
      files = scripts;
    } else {
      throw new Error('`scripts` arg must be either a directory with migrations or Migrations[]');
    }

    if (files.length === 0) {
      debug('no files found');
      return Promise.resolve();
    }

    // sort in order of execution
    files.sort(sortBy('final', 'min'));

    // fetch current version and then remove unneeded migrations
    const savedVersion = yield redis.get(VERSION_KEY);
    const currentVersion = parseInt(savedVersion || 0, 10);

    // ensure that all files have final > currentVersion
    files = files.filter(function (file) {
      return file.final > currentVersion;
    });

    if (files.length === 0) {
      debug('no files found');
      return Promise.resolve();
    }

    // pre-process all scripts and append LUA check for greate version
    const pipeline = redis.pipeline();

    yield files.map((() => {
      var _ref2 = (0, _bluebird.coroutine)(function* (file) {
        const final = file.final;
        assert(is.integer(+final), 'final version must be present and be an integer');

        if (is.string(file.script)) {
          // read file contents
          if (path.isAbsolute(file.script)) {
            file.script = fs.readFileSync(file.script, 'utf8');
          }

          // finalize content
          const script = appendLuaScript(final, file.min, file.script);
          debug('evaluating script after %s', currentVersion, script);
          pipeline.eval(script, 1, VERSION_KEY);
        } else if (is.fn(file.script)) {
          // must return promise
          yield file.script(redis, pipeline, VERSION_KEY, appendLuaScript);
        } else {
          throw new Error('script must be a function if not a string');
        }

        return null;
      });

      return function (_x3) {
        return _ref2.apply(this, arguments);
      };
    })());

    return pipeline.exec().map(function (resp) {
      var _resp = (0, _slicedToArray3.default)(resp, 2);

      const err = _resp[0];
      const result = _resp[1];

      if (err) {
        throw err;
      }

      return result;
    });
  });

  function performMigration(_x, _x2) {
    return _ref.apply(this, arguments);
  }

  return performMigration;
})();

