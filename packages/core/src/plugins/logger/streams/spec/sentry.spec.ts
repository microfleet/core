import * as Sentry from '@sentry/node'
import assert = require('assert')
import pinoms = require('pino-multi-stream')
import { createSandbox, match } from 'sinon'

describe('Logger Sentry Stream Suite', () => {
  const sandbox = createSandbox()
  const {
    default: sentryStreamFactory,
    SentryStream,
  } = require('../sentry')

  afterEach(() => {
    sandbox.restore()
  })

  it('sentryStreamFactory() should be able to init sentry stream', () => {
    const sentryInitSpy = sandbox.spy(Sentry, 'init')

    const { stream, level } = sentryStreamFactory({
      dsn: 'https://api@sentry.io/1822',
    })

    assert.strictEqual(level, 'error')
    assert.ok(stream)
    assert.ok(typeof stream.write === 'function')
    assert(sentryInitSpy.calledOnceWithExactly({
      dsn: 'https://api@sentry.io/1822',
      defaultIntegrations: false,
      integrations: [match.instanceOf(Sentry.Integrations.Console)] as any,
    }))
  })

  it('sentryStreamFactory() result should be able to handle pinoms message', () => {
    const streamConfig = sentryStreamFactory({
      dsn: 'https://api@sentry.io/1822',
    })
    const { stream } = streamConfig
    const logger = pinoms({ streams: [stream] })

    const captureEventSpy = sandbox.spy(Sentry, 'captureEvent')
    const streamWriteSpy = sandbox.spy(stream, 'write')

    logger.warn({ userId: 123 }, 'Warning message')

    assert(streamWriteSpy.calledOnceWithExactly(match.string))
    assert(captureEventSpy.calledOnceWith(match({
      extra: match({ userId: match(123), pid: match.number, v: 1 }),
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

    const captureEventSpy = sandbox.spy(Sentry, 'captureEvent')
    stream.write(
      '{"level":40,"time":1585845656002,"pid":1855,"hostname":"tester","$fingerprint":["api"],"msg":"Api warning","v":1}'
    )
    assert(captureEventSpy.calledOnceWithExactly(match({
      fingerprint: match.array.deepEquals(['api']),
    })))
  })
})
