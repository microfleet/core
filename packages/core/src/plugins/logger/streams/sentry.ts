import assert = require('assert')
import { SentryStream } from 'bunyan-sentry-stream'
import * as Sentry from '@sentry/node'

function sentryStreamFactory(config: any) {
  const { logLevel, dsn } = config

  assert(dsn, '"dsn" property must be set')

  Sentry.init(Object.assign({ environment: process.env.NODE_ENV || 'development' }, config))

  return {
    level: logLevel || 'error',
    stream: new SentryStream(Sentry),
    type: 'raw',
  }
}

export default sentryStreamFactory
