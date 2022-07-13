import build from 'pino-abstract-transport'
import { strict as assert } from 'node:assert'
import * as Sentry from '@sentry/node'
import { isAbsolute, resolve } from 'path'
import merge from 'lodash.merge'

export type SentryTransportConfig = {
  minLevel?: number
  externalConfiguration?: string
  sentry: Sentry.NodeOptions
}

class ExtendedError extends Error {
  constructor(message: string, public stack: string | undefined, public code: string | undefined, public signal: string | undefined) {
    super(message)
    this.name = "Error"
  }
}

export const pinoLevelToSentryLevel = (level: number): Sentry.SeverityLevel => {
  if (level == 60) {
    return "fatal"
  }
  if (level >= 50) {
    return "error"
  }
  if (level >= 40) {
    return "warning"
  }
  if (level >= 30) {
    return "log"
  }
  if (level >= 20) {
    return "info"
  }

  return "debug"
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sentryTransport({ externalConfiguration, sentry, minLevel = 50 }: SentryTransportConfig): Promise<ReturnType<typeof build>> {
  assert(sentry, 'config.sentry must be present')
  assert(sentry.dsn, '"dsn" property must be set')
  assert(sentry.release, 'release version must be set')

  if (externalConfiguration) {
    const pathLike = isAbsolute(externalConfiguration)
      ? externalConfiguration
      : resolve(process.cwd(), externalConfiguration)

    const extraConfig = await import(pathLike)
    merge(sentry, extraConfig)
  }

  Sentry.init({
    autoSessionTracking: false,
    ...sentry,
    defaultIntegrations: false,
    ...process.env.NODE_ENV === 'test' && {
      integrations: [
        new Sentry.Integrations.Console(),
      ],
    },
  })

  return build(async function (source) {
    for await (const obj of source) {
      const level = obj.level
      const scope = new Sentry.Scope()
      scope.setLevel(pinoLevelToSentryLevel(level))
      if (level > minLevel) {
        const stack = obj?.err?.stack
        if (stack) {
          const errorMessage = obj.err.message
          const signal = obj.err.signal
          const code = obj.err.code

          Sentry.captureException(
            new ExtendedError(errorMessage, stack, code, signal),
            scope
          )
        } else {
          Sentry.captureMessage(obj?.msg, scope)
        }
      }
    }
  })
}
