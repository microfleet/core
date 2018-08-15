// @flow
const assert = require('assert');
const raven = require('raven');
const { SentryStream } = require('bunyan-sentry-stream');

function sentryStreamFactory(config: Object) {
  const { level, options } = config;

  const dsn = config.dsn || config.dns;
  assert(dsn, '"dsn" property must be set');

  const client = new raven.Client(dsn, options);

  return {
    level: level || 'error',
    type: 'raw',
    stream: new SentryStream(client),
  };
}

module.exports = sentryStreamFactory;
