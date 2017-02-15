const assert = require('assert');
const { PluginsTypes } = require('..');
const stdout = require('stdout-stream');
const _require = require('../utils/require');

const bunyan = _require('bunyan');
const defaultConfig = {
  defaultLogger: false,
  debug: false,
  name: 'mservice',
  streams: {},
};

function streamsFactory(name, options) {
  switch (name) {
    case 'sentry': {
      const sentryStreamFactory = require('./logger/streams/sentry');

      return sentryStreamFactory(options);
    }
    default:
      return options;
  }
}

function attach(config = {}) {
  const service = this;
  const { config: { name: applicationName }, validator } = service;

  if (validator.validateSync) {
    assert.ifError(service.validator.validateSync('logger', config).error);
  }

  const {
    defaultLogger,
    debug,
    name,
    streams: streamsConfig,
  } = Object.assign({}, defaultConfig, config);

  if (defaultLogger instanceof bunyan) {
    service._log = defaultLogger;

    return;
  }

  const streams = [{ level: 'trace', type: 'raw', stream: new bunyan.RingBuffer({ limit: 100 }) }];

  if (defaultLogger === true) {
    streams.push({
      level: debug ? 'debug' : 'info',
      stream: stdout,
    });
  }

  Object
    .keys(streamsConfig)
    .forEach(streamName => streams.push(streamsFactory(streamName, streamsConfig[streamName])));

  service._log = bunyan.createLogger({
    streams,
    name: name || applicationName,
  });
}

module.exports = {
  attach,
  name: 'logger',
  type: PluginsTypes.essential,
};
