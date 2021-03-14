import * as Sentry from '@sentry/node'
import { LogLevel } from '@sentry/types'
import pinoms = require('pino-multi-stream')
import { createSandbox, match } from 'sinon'
import { sentryStreamFactory, SentryStream } from './sentry'

describe('Logger Sentry Stream Suite', () => {
  const sandbox = createSandbox()

  afterEach(() => {
    sandbox.restore()
  })

  it('sentryStreamFactory() should be able to init sentry stream', () => {
    const sentryInitSpy = sandbox.spy(Sentry, 'init')

    const { stream, level } = sentryStreamFactory({
      dsn: 'https://api@sentry.io/1822',
      logLevel: LogLevel.Error,
      release: 'test',
    })

    expect(level).toBe('error')
    expect(stream).toBeTruthy()
    expect(typeof stream.write === 'function').toBe(true)
    expect(sentryInitSpy.calledOnceWithExactly({
      dsn: 'https://api@sentry.io/1822',
      defaultIntegrations: false,
      logLevel: LogLevel.Error,
      release: 'test',
      integrations: [match.instanceOf(Sentry.Integrations.Console)] as any,
      _metadata: {
        sdk: {
          name: 'sentry.javascript.node',
          packages: [{
              name: 'npm:@sentry/node',
              version: Sentry.SDK_VERSION,
          }],
          version: Sentry.SDK_VERSION,
        },
      },
    })).toBe(true)
  })

  it('sentryStreamFactory() result should be able to handle pinoms message', () => {
    const streamConfig = sentryStreamFactory({
      dsn: 'https://api@sentry.io/1822',
      release: 'test',
    })
    const { stream } = streamConfig
    // @ts-expect-error - slightly invalid types, will work
    const logger = pinoms({ streams: [stream] })

    const captureEventSpy = sandbox.spy(Sentry, 'captureEvent')
    const streamWriteSpy = sandbox.spy(stream, 'write')

    logger.warn({ userId: 123 }, 'Warning message')

    expect(streamWriteSpy.calledOnceWithExactly(match.string)).toBe(true)
    expect(captureEventSpy.calledOnceWith(match({
      extra: match({ userId: match(123), pid: match.number }),
      timestamp: match.number,
      message: match('Warning message'),
      level: match('warning'),
      platform: match('node'),
      server_name: match.string,
      logger: match.typeOf('undefined'),
      release: match.string,
      environment: 'test',
      modules: match.object,
      sdk: match({ name: match('sentry.javascript.node'), version: match.string }),
      fingerprint: match.array.deepEquals(['{{ default }}']),
    }))).toBe(true)
  })

  it('SentryStream#write() should be able to modify Sentry event fingerprint', () => {
    const stream = new SentryStream({ release: '1.17.0' })

    const captureEventSpy = sandbox.spy(Sentry, 'captureEvent')
    const getFingerprintSpy = sandbox.spy(stream, 'getSentryFingerprint')
    stream.write(
      '{"level":40,"time":1585845656002,"pid":1855,"hostname":"tester","$fingerprint":["api"],"msg":"Api warning","v":1}'
    )
    expect(getFingerprintSpy.calledOnceWithExactly(['api'])).toBe(true)
    expect(captureEventSpy.calledOnceWithExactly(match({
      fingerprint: match.array.deepEquals(['api']),
    }))).toBe(true)
  })

  it('SentryStream#getSentryFingerprint() should be able to validate Sentry event fingerprint', () => {
    const stream = new SentryStream({ release: '1.17.0' })
    const captureEventSpy = sandbox.spy(Sentry, 'captureEvent')
    const invalidFingerprints = [
      ['{{ default }}', 123],
      [{ functionName: 'some', errorCode: 123 }],
      123,
    ]

    invalidFingerprints.forEach(fingerprint => {
      // @ts-expect-error checking invalid fingerprints
      expect(() => stream.getSentryFingerprint(fingerprint)).toThrow({
        name: 'AssertionError',
        message: '"$fingerprint" option value has to be an array of strings',
      })
    })

    expect(captureEventSpy.notCalled).toBe(true)
  })
})
