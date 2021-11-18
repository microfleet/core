import { pino } from 'pino'
import { strict as assert } from 'assert'
import { Microfleet } from '@microfleet/core'
import type { PluginTypes } from '@microfleet/utils'
import { file as tmpFile } from 'tempy'
import { open } from 'fs/promises'

describe('Logger suite', () => {
  it('when service does not include `logger` plugin, it emits an error or throws', () => {
    const plugins: (keyof typeof PluginTypes)[] = []
    const service = new Microfleet({
      plugins,
      name: 'tester',
    })

    assert(!service.log)
  })

  it('logger inits with output to stdout', () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger'],
      logger: {
        defaultLogger: {
          options: {
            destination: '/dev/null'
          }
        },
        worker: {
          autoEnd: false
        },
      }
    })

    assert.ok(service.log)
    assert.ok(typeof service.log.info === 'function')

    service.logClose?.()
  })

  it('logger inits with output to stdout: debug', () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger'],
      logger: {
        debug: true,
        defaultLogger: {
          options: {
            destination: '/dev/null'
          }
        },
        worker: {
          autoEnd: false
        },
      },
    })

    assert.ok(service.log)
    assert.ok(typeof service.log.info === 'function')

    service.logClose?.()
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
    const file = tmpFile()
    const handle = await open(file, 'w+')

    try {
      const service = new Microfleet({
        name: 'tester',
        plugins: ['validator', 'logger'],
        logger: {
          worker: {
            autoEnd: false,
          },
          prettifyDefaultLogger: false,
          defaultLogger: {
            options: {
              destination: file,
            },
          },
          streams: {
            sentry: {
              dsn: 'https://api@sentry.io/1822',
            },
          },
        },
      })

      assert.ok(service.log)
      assert.ok(typeof service.log.info === 'function')

      service.log.info({ sample: 'message', latency: 200 }, 'test')
      service.log.debug({ sample: 'message', latency: 200 }, 'test')
      service.log.debug({ sample: 'message', latency: 200 }, 'test')
      service.log.error(new Error('crap'), 'test')
      service.log.error('failed to produce message', [], new Error('oops'))
      service.log.error({ err: new Error('somewhere') }, 'empty object?')
      service.log.error({ err: new Error('fatal') }, 'unexpected error')

      // when autoEnd is false - must be called
      service.logClose?.()

      const data = await handle.readFile({ encoding: 'utf8' })
      const lines = data.split('\n').slice(0, -1).map((x) => JSON.parse(x))
      assert.equal(lines.length, 8)

      lines.forEach((obj) => {
        assert(obj.level)
        assert.equal(obj.name, 'tester')
        assert(obj.msg)
      })

      assert.equal(lines.filter((x) => x.err).length, 3)
    } finally {
      await handle.close()
    }
  })
})
