const is = require('is');
const { PluginsTypes } = require('../');
const stdout = require('stdout-stream');
const _require = require('../utils/require');

exports.name = 'logger';
exports.type = PluginsTypes.essential;

exports.attach = function attachLogger(conf) {
  const service = this;
  const bunyan = _require('bunyan');

  const { debug, name } = service._config;
  const loggerEnabled = is.undef(conf) ? debug : conf;

  if (loggerEnabled && loggerEnabled instanceof bunyan) {
    service._log = loggerEnabled;
    return;
  }

  const streams = [{
    level: 'trace',
    type: 'raw',
    stream: new bunyan.RingBuffer({ limit: 100 }),
  }];

  if (loggerEnabled) {
    streams.push({
      stream: stdout,
      level: debug ? 'debug' : 'info',
    });
  }

  service._log = bunyan.createLogger({
    name: name || 'mservice',
    streams,
  });
};
