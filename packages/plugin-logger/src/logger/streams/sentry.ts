import build from 'pino-abstract-transport'
import { strict as assert } from 'node:assert'
import { init, captureException, captureMessage, Scope, Integrations, type SeverityLevel, type NodeOptions } from '@sentry/node'
import { isAbsolute, resolve } from 'path'
import merge from 'lodash.merge'

export type SentryTransportConfig = {
  minLevel?: number
  externalConfiguration?: string
  sentry: NodeOptions
}

export class ExtendedError extends Error {
  constructor(message: string, public stack: string | undefined, public code: string | undefined, public signal: string | undefined) {
    super(message)
    this.name = "Error"
  }
}

export const pinoLevelToSentryLevel = (level: number): SeverityLevel => {
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

  const opts: NodeOptions = {
    autoSessionTracking: false,
    ...sentry,
    defaultIntegrations: false,
    ...process.env.NODE_ENV === 'test' && {
      integrations: [
        new Integrations.Console(),
      ],
    },
  }

  init(opts)

  const kOmitKeys = ['message', 'signal', 'code', 'stack']

  return build(async function (source) {
    for await (const obj of source) {
      const { level, tags, extras, user, fingerprint } = obj
      const scope = new Scope()
      scope.setLevel(pinoLevelToSentryLevel(level))
      scope.setExtras(extras)
      scope.setUser(user)
      scope.setTags(tags)
      if (fingerprint) {
        scope.setFingerprint(fingerprint)
      }

      // extend scope with enumerable error properties if they exist, omit manually processed ones
      if (obj.err) {
        for (const [key, prop] of Object.entries(obj.err)) {
          if (!kOmitKeys.includes(key)) {
            scope.setExtra(key, prop)
          }
        }
      }

      if (level >= minLevel) {
        const stack = obj.err?.stack

        if (stack) {
          const errorMessage = obj.err.message
          const signal = obj.err.signal
          const code = obj.err.code

          captureException(
            new ExtendedError(errorMessage, stack, code, signal),
            scope
          )
        } else {
          captureMessage(obj.msg, scope)
        }
      }
    }
  })
}
