import is = require('is');
import { Writable } from 'stream';
import { Microfleet, PluginTypes } from '../';
import _require from '../utils/require';

const defaultConfig = {
  debug: false,
  defaultLogger: false,
  name: 'mservice',
  streams: {},
  trace: false,
};

interface IStream {
  level: string;
  stream: Writable;
  type?: string;
}

function streamsFactory(streamName: string, options: any) {
  switch (streamName) {
    case 'sentry': {
      const sentryStreamFactory = require('./logger/streams/sentry').default;
      return sentryStreamFactory(options);
    }

    default:
      return options;
  }
}

/**
 * Plugin Type
 */
export const type = PluginTypes.essential;

/**
 * Plugin Name
 */
export const name = 'logger';

/**
 * Plugin init function.
 * @param  config - Logger configuration.
 */
export function attach(this: Microfleet, config: any = {}) {
  const service = this;
  const { config: { name: applicationName } } = service;
  const bunyan = _require('bunyan');
  const stdout = require('stdout-stream') as Writable;

  if (is.fn(service.ifError)) {
    service.ifError('logger', config);
  }

  const {
    debug,
    defaultLogger,
    name: serviceName,
    streams: streamsConfig,
    trace,
  } = Object.assign({}, defaultConfig, config);

  if (defaultLogger instanceof bunyan) {
    service.log = defaultLogger;
    return;
  }

  const streams: IStream[] = [];

  if (trace === true) {
    streams.push({
      level: 'trace',
      stream: new bunyan.RingBuffer({ limit: 100 }),
      type: 'raw',
    });
  }

  if (defaultLogger === true) {
    streams.push({
      level: debug ? 'debug' : 'info',
      stream: stdout,
    });
  }

  for (const [streamName, streamConfig] of Object.entries(streamsConfig)) {
    streams.push(streamsFactory(streamName, streamConfig));
  }

  service.log = bunyan.createLogger({
    name: applicationName || serviceName,
    streams,
  });
}
