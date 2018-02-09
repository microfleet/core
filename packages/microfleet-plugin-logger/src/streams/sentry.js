// @flow
const assert = require('assert');
const raven = require('raven');
const { SentryStream } = require('bunyan-sentry-stream');

function sentryStreamFactory(config: Object) {
  const { dns, level, options } = config;

  assert(dns, '"dns" property must be set');

  const client = new raven.Client(dns, options);

  return {
    level: level || 'error',
    type: 'raw',
    stream: new SentryStream(client),
  };
}

module.exports = sentryStreamFactory;
