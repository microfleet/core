import { pino } from 'pino'
import { strict as assert } from 'assert'
import { Microfleet } from '@microfleet/core'
import type { PluginTypes } from '@microfleet/utils'
import { file as tmpFile } from 'tempy'
import { open } from 'fs/promises'
import { HttpStatusError } from 'common-errors'
import Fastify from 'fastify'
import { setTimeout } from 'timers/promises'

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

  it('should be able to init sentry stream, including external configuration', async () => {
    const file = tmpFile()
    const handle = await open(file, 'w+')
    const fastify = Fastify({ logger: true })
    const reports: any[] = []

    fastify.all('/*', async (req) => {
      reports.push([req.method, req.routeOptions.url, req.query, req.body])
      return 'ok'
    })

    await fastify.listen({ port: 9999, host: '0.0.0.0' })

    try {
      const service = new Microfleet({
        name: 'tester',
        plugins: ['validator', 'logger'],
        logger: {
          prettifyDefaultLogger: false,
          defaultLogger: {
            options: {
              destination: file,
            },
          },
          streams: {
            sentry: {
              sentry: {
                dsn: 'http://api@127.0.0.1:9999/3123891023810',
                transportOptions: {
                  headers: {
                    'content-type': 'text/plain', // so that fastify can read data
                  },
                },
              },
              externalConfiguration: './__tests__/sentry.beforeSend',
              level: 'debug',
              minLevel: 10,
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
      service.log.error({ err: new Error('could not find associated data') }, 'must be filtered')
      service.log.error({ err: new HttpStatusError(200, '412: upload was already processed') }, 'must be filtered 2')
      service.log.flush() // writing is async, we need to flush the data

      // to ensure it actually flushes to disk
      await setTimeout(3000)

      const data = await handle.readFile({ encoding: 'utf8' })
      const lines = data.split('\n').slice(0, -1).map((x) => JSON.parse(x))
      assert.equal(lines.length, 10)

      lines.forEach((obj) => {
        assert(obj.level)
        assert.equal(obj.name, 'tester')
        assert(obj.msg)
      })

      assert.equal(lines.filter((x) => x.err).length, 5)

      // filters last 2 errors
      assert.equal(reports.length, 8, JSON.stringify(reports))

    } finally {
      await handle.close()
      await fastify.close()
    }
  })
})
