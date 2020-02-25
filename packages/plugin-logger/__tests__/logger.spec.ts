import Promise = require('bluebird')
import assert = require('assert')
import pino = require('pino')

describe('Logger suite', () => {
  const { Microfleet } = require('@microfleet/core')

  it('when service does not include `logger` plugin, it emits an error or throws', () => {
    const service = new Microfleet({ plugins: [] })
    assert(!service.log)
  })

  it('logger inits with output to stdout', () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger'],
      logger: {
        defaultLogger: true,
      },
    })

    assert.ok(service.log)
    assert.ok(typeof service.log.info === 'function')
  })

  it('logger inits with output to stdout: debug', () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger'],
      logger: {
        defaultLogger: true,
        debug: true,
      },
    })

    assert.ok(service.log)
    assert.ok(typeof service.log.info === 'function')
  })

  it('should be able to init custom logger', () => {
    const logger = pino({ name: 'test' })
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger'],
      logger: {
        defaultLogger: logger,
      },
    })

    assert.deepEqual(service.log, logger)
  })

  it('should be able to init sentry stream', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger'],
      logger: {
        streams: {
          sentry: {
            dsn: 'https://api@sentry.io/1822',
          },
        },
      },
    })

    service.log.info({ sample: 'message', latency: 200 }, 'test')
    service.log.debug({ sample: 'message', latency: 200 }, 'test')
    service.log.error(new Error('crap'), 'test')
    service.log.error('failed to produce message', [], new Error('oops'))
    service.log.error({ err: new Error('somewhere') }, 'empty object?')
    service.log.error({ err: new Error('fatal') }, 'unexpected error')

    await Promise.delay(1000)

    assert.ok(service.log)
    assert.ok(typeof service.log.info === 'function')
  })
})
