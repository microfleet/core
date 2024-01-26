import Sentry = require('@sentry/node')
import { createSandbox, match } from 'sinon'
import { sentryTransport as sentryStreamFactory, ExtendedError } from './sentry'
import { pino } from 'pino'
import sentryTestkit from 'sentry-testkit'
import { strict as assert } from 'assert'
import { HttpStatusError } from 'common-errors'
import { setTimeout } from 'timers/promises'
import { SENTRY_FINGERPRINT_DEFAULT } from '../../constants'

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

    logger.warn({
      userId: 123,
      tags: { testTag: 'test' },
      extras: { someData: 'test' },
      user: { id: 1234 },
      fingerprint: [SENTRY_FINGERPRINT_DEFAULT, 'test'],
    }, 'Warning message')
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
      _fingerprint: ['{{ default }}', 'test'],
      _contexts: {},
      _sdkProcessingMetadata: {},
      _level: 'warning'
    })))
  })

  it('sentryStreamFactory() result should be able to handle pinoms error message', async () => {
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
    const err = new HttpStatusError(400, 'Bad request')

    logger.error({
      err,
    }, 'Error message')
    logger.flush()

    await Sentry.flush()
    assert(streamWriteSpy.calledOnceWithExactly(match.string))

    await setTimeout(1000)
    assert.equal(testkit.reports().length, 1)
    assert(captureEventSpy.captureException.calledOnceWith(
      match
        .instanceOf(ExtendedError)
        .and(match.has('stack')),
      match({
        _notifyingListeners: false,
        _scopeListeners: [],
        _eventProcessors: [],
        _breadcrumbs: [],
        _attachments: [],
        _user: {},
        _tags: {},
        _extra: {
          type: 'HttpStatusError',
          status: 400,
          statusCode: 400,
          status_code: 400,
          name: 'HttpStatusError'
        },
        _contexts: {},
        _sdkProcessingMetadata: {},
        _level: 'error'
      }))
    )
  })
})
