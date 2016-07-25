'use strict';

var _require = require('common-errors');

const ArgumentError = _require.ArgumentError;

const glob = require('glob');
const fs = require('fs');
const path = require('path');
const debug = require('debug')('mservice:lua');

function loadLuaScripts(dir, redis) {
  if (!path.isAbsolute(dir)) {
    throw new ArgumentError('config.scripts must be an absolute path');
  }

  debug('loading form %s', dir);

  return glob.sync('*.lua', { cwd: dir }).forEach(scriptName => {
    const lua = fs.readFileSync(`${ dir }/${ scriptName }`, 'utf8');
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
}

module.exports = loadLuaScripts;