const bunyan = require('bunyan');

exports.name = 'logger';

exports.attach = function attachLogger(conf) {
  const service = this;
  const { debug, name } = service._config;
  const loggerEnabled = typeof conf === 'undefined' ? debug : conf;

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
      stream: process.stdout,
      level: debug ? 'debug' : 'info',
    });
  }

  service._log = bunyan.createLogger({
    name: name || 'mservice',
    streams,
  });
};
