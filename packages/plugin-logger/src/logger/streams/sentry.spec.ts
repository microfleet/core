import Sentry = require('@sentry/node')
import { createSandbox, match } from 'sinon'
import { sentryTransport as sentryStreamFactory } from './sentry'
import { pino } from 'pino'
import sentryTestkit from 'sentry-testkit'
import { strict as assert } from 'assert'
import { setTimeout } from 'timers/promises'

describe('Logger Sentry Stream Suite', () => {
  const sandbox = createSandbox()

  afterEach(async () => {
    sandbox.restore()
    await Sentry.close()
  })

  it('sentryStreamFactory() should be able to init sentry stream', async () => {
    const sentryInitSpy = sandbox.spy(Sentry)
    const { testkit, sentryTransport } = sentryTestkit()

    const stream = await sentryStreamFactory({
      sentry: {
        dsn: 'https://api@sentry.io/1822',
        release: 'test',
        transport: sentryTransport,
      },
      minLevel: 30,
    })

    assert(stream)
    assert(typeof stream.write === 'function')
    assert(sentryInitSpy.init.calledWithExactly({
      dsn: 'https://api@sentry.io/1822',
      defaultIntegrations: [],
      release: 'test',
      instrumenter: 'sentry',
      autoSessionTracking: false,
      transport: sentryTransport,
      integrations: [match({ name: 'Console', setupOnce: match.func })] as any,
    }))

    assert.equal(testkit.reports().length, 0)
  })

  it('sentryStreamFactory() result should be able to handle pinoms message', async () => {
    const { testkit, sentryTransport } = sentryTestkit()
    const stream = await sentryStreamFactory({
      sentry: {
        dsn: 'https://api@sentry.io/1822',
        release: 'test',
        transport: sentryTransport,
      },
      minLevel: 10,
    })

    const streamWriteSpy = sandbox.spy(stream, 'write')
    const captureEventSpy = sandbox.spy(Sentry)

    const pinoms = pino.multistream([
      { stream, level: 'info' },
      { stream: pino.destination({ fd: process.stdout.fd }), level: 'debug' },
    ], { dedupe: false })

    const logger = pino({ level: 'debug' }, pinoms)

    logger.warn({ userId: 123, tags: { testTag: 'test' }, extras: { someData: 'test' }, user: { id: 1234 } }, 'Warning message')
    logger.flush()

    await Sentry.flush()
    assert(streamWriteSpy.calledOnceWithExactly(match.string))

    await setTimeout(1000)
    assert.equal(testkit.reports().length, 1)
    assert(captureEventSpy.captureMessage.calledOnceWith('Warning message', match({
      _notifyingListeners: false,
      _scopeListeners: [],
      _eventProcessors: [],
      _breadcrumbs: [],
      _attachments: [],
      _user: { id: 1234 },
      _tags: { testTag: 'test' },
      _extra: { someData: 'test' },
      _contexts: {},
      _sdkProcessingMetadata: {},
      _level: 'warning'
    })))
  })

  // it('SentryStream#write() should be able to modify Sentry event fingerprint', () => {
  //   const stream = new SentryStream({ release: '1.17.0' })
  //   const getFingerprintSpy = sandbox.spy(stream, 'getSentryFingerprint')
  //   const captureEventSpy = sandbox.spy(Sentry, 'captureEvent')

  //   stream.write(
  //     JSON.parse('{"level":40,"time":1585845656002,"pid":1855,"hostname":"tester","$fingerprint":["api"],"msg":"Api warning","v":1}')
  //   )
  //   assert(getFingerprintSpy.calledOnceWithExactly(['api']))
  //   assert(captureEventSpy.calledOnceWithExactly(match({
  //     fingerprint: match.array.deepEquals(['api']),
  //   })))
  // })

  // it('SentryStream#getSentryFingerprint() should be able to validate Sentry event fingerprint', () => {
  //   const stream = new SentryStream({ release: '1.17.0' })
  //   const captureEventSpy = sandbox.spy(Sentry, 'captureEvent')

  //   const invalidFingerprints = [
  //     ['{{ default }}', 123],
  //     [{ functionName: 'some', errorCode: 123 }],
  //     123,
  //   ]

  //   invalidFingerprints.forEach(fingerprint => {
  //     // @ts-expect-error checking invalid fingerprints
  //     const fn = () => stream.getSentryFingerprint(fingerprint)
  //     assert.throws(fn, {
  //       name: 'AssertionError',
  //       message: '"$fingerprint" option value has to be an array of strings',
  //     })
  //   })

  //   assert(captureEventSpy.notCalled)
  // })
})
