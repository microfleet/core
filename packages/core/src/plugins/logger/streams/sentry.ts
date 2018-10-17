import assert = require('assert')
import { SentryStream } from 'bunyan-sentry-stream'
import raven = require('raven')

function sentryStreamFactory(config: any) {
  const { level, options } = config

  const dsn = config.dsn || config.dns
  assert(dsn, '"dsn" property must be set')

  const client = new raven.Client(dsn, options)

  return {
    level: level || 'error',
    stream: new SentryStream(client),
    type: 'raw',
  }
}

export default sentryStreamFactory
