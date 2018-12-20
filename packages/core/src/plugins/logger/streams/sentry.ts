import omit = require('lodash/omit')
import assert = require('assert')
import * as Sentry from '@sentry/node'

/**
 * Sentry stream for Pino
 */
class SentryStream {
  /**
   * Method call by Pino to save log record
   */
  public write(record: any) {
    const { err, tags } = record
    const level = this.getSentryLevel(record)
    const extra = omit(record, 'err', 'tags')

    Sentry.withScope((scope: Sentry.Scope) => {
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          scope.setTag(tag, tag)
        }
      } else if (tags && typeof tags === 'object') {
        for (const [tag, value] of Object.entries<string>(tags)) {
          scope.setTag(tag, value)
        }
      }

      if (extra) {
        scope.setExtra('extra', extra)
      }

      if (level) {
        scope.setLevel(level)
      }

      if (err) {
        Sentry.captureException(this.deserializeError(err))
      } else {
        Sentry.captureMessage(record.msg)
      }
    })

    return true
  }

  /**
   * Convert Bunyan level number to Sentry level label.
   * Rule : >50=error ; 40=warning ; info otherwise
   * @param  {Object} record Bunyan log record
   * @return {String}        Sentry level
   */
  getSentryLevel(record: any): Sentry.Severity {
    const level = record.level as number

    if (level >= 50) return Sentry.Severity.Error
    if (level === 40) return Sentry.Severity.Warning

    return Sentry.Severity.Info
  }

  /**
   * Error deserialiazing function. Bunyan serialize the error to object:
   * https://github.com/trentm/node-bunyan/blob/master/lib/bunyan.js#L1089
   * @param  {object} data serialized Bunyan
   * @return {Error}      the deserialiazed error
   */
  deserializeError(data: any): any {
    if (data instanceof Error) return data

    const error = new Error(data.message) as any
    error.name = data.name
    error.stack = data.stack
    error.code = data.code
    error.signal = data.signal
    return error
  }
}

function sentryStreamFactory(config: Sentry.NodeOptions) {
  const { logLevel, dsn } = config

  assert(dsn, '"dsn" property must be set')

  Sentry.init(config)

  return {
    level: logLevel || 'error',
    stream: new SentryStream(),
  }
}

export default sentryStreamFactory
