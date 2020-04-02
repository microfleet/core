const Sentry = require('@sentry/node');
const assert = require('assert');
const pinoms = require('pino-multi-stream');
const { createSandbox, match } = require('sinon');

describe('Logger Sentry Stream Suite', function testSuite() {
  const sandbox = createSandbox();
  const { default: sentryStreamFactory, SentryStream } = require('../../../../src/plugins/logger/streams/sentry');

  afterEach(() => {
    sandbox.restore();
  })

  it('sentryStreamFactory() should be able to init sentry stream', function test() {
    sandbox.spy(Sentry, 'init');

    const { stream, level } = sentryStreamFactory({
      dsn: 'https://api@sentry.io/1822',
    });

    assert.strictEqual(level, 'error');
    assert.ok(stream);
    assert.ok(typeof stream.write === 'function');

    assert(Sentry.init.calledOnceWithExactly({
      dsn: 'https://api@sentry.io/1822',
      defaultIntegrations: false,
      integrations: [match.instanceOf(Sentry.Integrations.Console)],
    }));
  });

  it('sentryStreamFactory() result should be able to handle pinoms message', function test() {
    const streamConfig = sentryStreamFactory({
      dsn: 'https://api@sentry.io/1822',
    });
    const { stream } = streamConfig;
    const logger = pinoms({ streams: [stream] });

    sandbox.spy(Sentry, 'captureEvent');
    sandbox.spy(stream, 'write');

    logger.warn({ userId: 123 }, 'Warning message');

    assert(stream.write.calledOnceWithExactly(match.string));
    assert(Sentry.captureEvent.calledOnceWith(match({
      extra: match({ userId: match(123), pid: match.number, v: 1 }),
      timestamp: match.number,
      message: match('Warning message'),
      level: match('warn'),
      platform: match('node'),
      server_name: match('tester'),
      logger: match.typeOf('undefined'),
      release: match.string,
      environment: 'test',
      modules: match.object,
      sdk: match({ name: match('sentry.javascript.node'), version: match.string }),
      fingerprint: match.array.deepEquals(['{{ default }}']),
    })));
  });

  it('SentryStream#write() should be able to modify Sentry event fingerprint', function test() {
    const stream = new SentryStream({ release: '1.17.0' });

    sandbox.spy(Sentry, 'captureEvent');
    stream.write(
      '{"level":40,"time":1585845656002,"pid":1855,"hostname":"tester","$fingerprint":["api"],"msg":"Api warning","v":1}'
    );
    assert(Sentry.captureEvent.calledOnceWithExactly(match({
      fingerprint: match.array.deepEquals(['api']),
    })));
  });
});
