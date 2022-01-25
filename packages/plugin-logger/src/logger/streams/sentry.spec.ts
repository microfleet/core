import * as Sentry from '@sentry/node'
import { createSandbox, match } from 'sinon'
import sentryStreamFactory, { SentryStream } from './sentry'
import { pino } from 'pino'
import sentryTestkit from 'sentry-testkit'
import { strict as assert } from 'assert'

describe('Logger Sentry Stream Suite', () => {
  const sandbox = createSandbox()

  afterEach(async () => {
    sandbox.restore()
    await Sentry.close()
  })

  it('sentryStreamFactory() should be able to init sentry stream', async () => {
    const sentryInitSpy = sandbox.spy(Sentry, 'init')
    const { testkit, sentryTransport } = sentryTestkit()

    const stream = await sentryStreamFactory({
      dsn: 'https://api@sentry.io/1822',
      level: 'error',
      release: 'test',
      transport: sentryTransport,
    })

    assert(stream)
    assert(typeof stream.write === 'function')
    assert(sentryInitSpy.calledOnceWithExactly({
      dsn: 'https://api@sentry.io/1822',
      defaultIntegrations: [],
      release: 'test',
      autoSessionTracking: false,
      transport: sentryTransport,
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
    }))

    assert.equal(testkit.reports().length, 0)
  })

  it('sentryStreamFactory() result should be able to handle pinoms message', async () => {
    const { testkit, sentryTransport } = sentryTestkit()
    const stream = await sentryStreamFactory({
      dsn: 'https://api@sentry.io/1822',
      release: 'test',
      transport: sentryTransport,
    })
    const streamWriteSpy = sandbox.spy(stream, 'write')
    const captureEventSpy = sandbox.spy(Sentry, 'captureEvent')

    const pinoms = pino.multistream([
      { stream, level: 'info' },
      { stream: pino.destination({ fd: process.stdout.fd }), level: 'debug' },
    ], { dedupe: false })

    const logger = pino({ level: 'debug' }, pinoms)

    logger.warn({ userId: 123 }, 'Warning message')
    //logger.flush()

    await Sentry.flush()

    assert(streamWriteSpy.calledOnceWithExactly(match.string))
    assert.equal(testkit.reports().length, 1)

    assert(captureEventSpy.calledOnceWith(match({
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
    })))
  })

  it('SentryStream#write() should be able to modify Sentry event fingerprint', () => {
    const stream = new SentryStream({ release: '1.17.0' })
    const getFingerprintSpy = sandbox.spy(stream, 'getSentryFingerprint')
    const captureEventSpy = sandbox.spy(Sentry, 'captureEvent')

    stream.write(
      JSON.parse('{"level":40,"time":1585845656002,"pid":1855,"hostname":"tester","$fingerprint":["api"],"msg":"Api warning","v":1}')
    )
    assert(getFingerprintSpy.calledOnceWithExactly(['api']))
    assert(captureEventSpy.calledOnceWithExactly(match({
      fingerprint: match.array.deepEquals(['api']),
    })))
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
      const fn = () => stream.getSentryFingerprint(fingerprint)
      assert.throws(fn, {
        name: 'AssertionError',
        message: '"$fingerprint" option value has to be an array of strings',
      })
    })

    assert(captureEventSpy.notCalled)
  })
})
