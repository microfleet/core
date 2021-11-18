import build from 'pino-abstract-transport'
import assert = require('assert')
import * as Sentry from '@sentry/node'
import { LogLevel } from '@sentry/types'
import lsmod = require('lsmod')
import { pino } from 'pino'
import {
  extractStackFromError,
  parseStack,
  prepareFramesForEvent,
} from '@sentry/node/dist/parsers'

import { SENTRY_FINGERPRINT_DEFAULT } from '../../constants'

// keys to be banned
const BAN_LIST: { [key: string]: boolean } = {
  msg: true,
  time: true,
  hostname: true,
  name: true,
  level: true,
}

const EVENT_MODIFIERS: { [key: string]: boolean } = {
  $fingerprint: true,
}

interface SentryStreamOptions {
  release: string
}

interface ErrorLike {
  message: string
  name: string
  stack?: string
  code?: string
  signal?: string
}

/**
 * Sentry stream for Pino
 */
sentryTransport.SentryStream = class SentryStream {
  private release: string
  private env?: string = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV
  private modules?: any = lsmod()

  constructor(opts: SentryStreamOptions) {
    this.release = opts.release
  }

  /**
   * Method call by Pino to save log record
   * msg is a stringified set of data
   */
  public write(event: Record<string, any>): boolean {
    const extra = Object.create(null)

    for (const [key, value] of Object.entries<any>(event)) {
      if (BAN_LIST[key] === true || EVENT_MODIFIERS[key] === true) {
        continue
      }

      extra[key] = value
    }

    (async () => {
      let stacktrace = undefined
      if (event.err && event.err.stack) {
        try {
          const stack = extractStackFromError(event.err)
          const frames = await parseStack(stack)
          stacktrace = { frames: prepareFramesForEvent(frames) }
        } catch (e: any) { /* ignore */ }
      }

      Sentry.captureEvent({
        extra,
        stacktrace,
        message: event.msg,
        timestamp: event.time / 1e3,
        level: this.getSentryLevel(event.level),
        platform: 'node',
        server_name: event.hostname,
        logger: event.name,
        release: this.release,
        environment: this.env,
        sdk: {
          name: Sentry.SDK_NAME,
          version: Sentry.SDK_VERSION,
        },
        modules: this.modules,
        fingerprint: this.getSentryFingerprint(event.$fingerprint),
      })
    })()

    return true
  }

  /**
   * Error deserialiazing function. Bunyan serialize the error to object:
   * https://github.com/trentm/node-bunyan/blob/master/lib/bunyan.js#L1089
   * @param  {object} data serialized Bunyan
   * @return {Error}      the deserialiazed error
   */
  deserializeError(data: Error | ErrorLike): ErrorLike {
    if (data instanceof Error) return data

    const error = new Error(data.message) as ErrorLike
    error.name = data.name
    error.stack = data.stack
    error.code = data.code
    error.signal = data.signal
    return error
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

  getSentryFingerprint(fingerprint?: string[]): string[] {
    if (!fingerprint) {
      return [SENTRY_FINGERPRINT_DEFAULT]
    }

    assert(
      Array.isArray(fingerprint) && fingerprint.every(part => typeof part === 'string'),
      '"$fingerprint" option value has to be an array of strings'
    )

    return fingerprint
  }
}

sentryTransport.sentryToPinoLogLevel = ({ logLevel }: Sentry.NodeOptions): pino.Level => {
  let level: pino.Level
  if (logLevel === LogLevel.None) {
    level = 'fatal'
  } else if (logLevel === LogLevel.Debug) {
    level = 'debug'
  } else if (logLevel === LogLevel.Verbose) {
    level = 'trace'
  } else if (logLevel === LogLevel.Error) {
    level = 'error'
  } else {
    level = 'warn'
  }

  return level
}

async function sentryTransport(config: Sentry.NodeOptions): Promise<ReturnType<typeof build>> {
  assert(config.dsn, '"dsn" property must be set')
  assert(config.release, 'release version must be set')

  if (process.env.NODE_ENV === 'test' && !config.transport) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { sentryTransport } = require('sentry-testkit')()
    config.transport = sentryTransport
  }

  Sentry.init({
    autoSessionTracking: false,
    ...config,
    defaultIntegrations: false,
    ...process.env.NODE_ENV === 'test' && {
      integrations: [
        new Sentry.Integrations.Console(),
      ],
    },
  })

  const destination = new sentryTransport.SentryStream({ release: config.release })

  return build(async function (source) {
    for await (const obj of source) {
      const toDrain = !destination.write(obj)
      // This block will handle backpressure
      if (toDrain) {
        await Sentry.flush(1000)
      }
    }
  }, {
    async close() {
      await Sentry.close(1000)
    }
  })
}

export = sentryTransport
