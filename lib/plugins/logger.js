'use strict';

const bunyan = require('bunyan');
const is = require('is');
const stdout = require('stdout-stream');

exports.name = 'logger';

exports.attach = function attachLogger(conf) {
  const service = this;
  var _service$_config = service._config;
  const debug = _service$_config.debug;
  const name = _service$_config.name;

  const loggerEnabled = is.undef(conf) ? debug : conf;

  if (loggerEnabled && loggerEnabled instanceof bunyan) {
    service._log = loggerEnabled;
    return;
  }

  const streams = [{
    level: 'trace',
    type: 'raw',
    stream: new bunyan.RingBuffer({ limit: 100 })
  }];

  if (loggerEnabled) {
    streams.push({
      stream: stdout,
      level: debug ? 'debug' : 'info'
    });
  }

  service._log = bunyan.createLogger({
    name: name || 'mservice',
    streams
  });
};