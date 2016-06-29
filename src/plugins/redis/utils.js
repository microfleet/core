const { ArgumentError } = require('common-errors');
const glob = require('glob');
const fs = require('fs');
const path = require('path');

function loadLuaScripts(dir, redis) {
  if (!path.isAbsolute(dir)) {
    throw new ArgumentError('config.scripts must be an absolute path');
  }

  return glob
    .sync('*.lua', { cwd: dir })
    .forEach(scriptName => {
      const lua = fs.readFileSync(scriptName, 'utf-8');
      const name = path.basename(scriptName, '.lua');
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
