const fs = require('fs');
const debug = require('debug')('mservice:redis:migrations');

const script = fs.readFileSync(`${__dirname}/migration.lua`, 'utf8');
exports.min = 2;
exports.final = 10;

exports.script = (redis, pipeline, versionKey, appendLuaScript) => redis
  .get('cardinality')
  .return(10)
  .then(cardinality => {
    const lua = appendLuaScript(exports.final, exports.min, script);
    debug('evaluating', lua);
    pipeline.eval(lua, 2, versionKey, 'some-index-key', cardinality);
  });
