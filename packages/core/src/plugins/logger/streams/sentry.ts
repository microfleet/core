import assert = require('assert')
import * as Sentry from '@sentry/node'

/**
 * Sentry stream for Pino
 */
class SentryStream {
  private lastLevel?: number
  private lastTime?: string
  private lastMsg?: string
  private lastObj?: any

  /**
   * Method call by Pino to save log record
   */
  public write(_: string) {
    const record = this.lastObj || Object.create(null)
    const { err, tags } = record
    const level = this.getSentryLevel(this.lastLevel as number)

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

      scope.setExtra('extra', this.lastObj)
      scope.setExtra('captured', this.lastTime)
      scope.setExtra('message', this.lastMsg)

      if (err) {
        Sentry.captureException(this.deserializeError(err))
      } else {
        Sentry.captureMessage(this.lastMsg || '<no-message>', level)
      }
    })

    return true
  }

  /**
   * Convert Bunyan level number to Sentry level label.
   * Rule : >50=error ; 40=warning ; info otherwise
   */
  getSentryLevel(level: number): Sentry.Severity {
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

  const dest = new SentryStream()
  // @ts-ignore
  dest[Symbol.for('pino.metadata')] = true

  // rewire for testing purposes
  if (process.env.NODE_ENV === 'test') {
    // @ts-ignore
    Sentry.captureException = console.info.bind(console, 'test>>>')
    // @ts-ignore
    Sentry.captureMessage = console.info.bind(console, 'test>>>')
  }

  return {
    level: logLevel || 'error',
    stream: dest,
  }
}

export default sentryStreamFactory
