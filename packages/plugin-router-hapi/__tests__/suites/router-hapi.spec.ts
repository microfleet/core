import { strictEqual, deepStrictEqual } from 'assert'
import { resolve } from 'path'
import { all } from 'bluebird'
import * as cheerio from 'cheerio'
import * as request from 'request-promise'
import { Microfleet } from '@microfleet/core'
import handlebars from 'handlebars'

describe('@microfleet/plugin-router-hapi', () => {
  it('should be able to attach \'router\' plugin', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'hapi', 'router-hapi'],
      hapi: {
        server: {
          port: 3000,
        },
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artefacts/actions'),
        },
      },
    })

    await service.connect()

    const options = {
      json: true,
      method: 'POST',
      resolveWithFullResponse: true,
      simple: false,
      uri: 'http://0.0.0.0:3000/echo',
      body: { message: 'foo' },
    }

    try {
      await all([
        request(options).then((response) => {
          strictEqual(response.statusCode, 200)
          deepStrictEqual(response.body, { message: 'foo' })
        }),
        request({ ...options, uri: 'http://0.0.0.0:3000/not-found' }).then((response) => {
          strictEqual(response.statusCode, 404)
          strictEqual(response.body.name, 'NotFoundError')
          deepStrictEqual(response.body.message, 'Not Found: "route "not-found" not found"')
        }),
      ])
    } finally {
      await service.close()
    }
  })

  it('should be able to use \'router\' plugin prefix', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'hapi', 'router-hapi'],
      hapi: {
        server: {
          port: 3000,
        },
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artefacts/actions'),
          prefix: 'foo.bar',
        },
      },
    })

    await service.connect()

    try {
      const response = await request({
        json: true,
        method: 'POST',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/foo/bar/echo',
        body: { message: 'foo' },
      })

      strictEqual(response.statusCode, 200)
      deepStrictEqual(response.body, { message: 'foo' })
    } finally {
      await service.close()
    }
  })

  it('should be able to use \'hapi\' plugin prefix', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'hapi', 'router-hapi'],
      hapi: {
        server: {
          port: 3000,
        },
      },
      'router-hapi': {
        prefix: 'foo.bar',
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artefacts/actions'),
        },
      },
    })

    await service.connect()

    try {
      const response = await request({
        json: true,
        method: 'POST',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/foo/bar/echo',
        body: { message: 'foo' },
      })

      strictEqual(response.statusCode, 200)
      deepStrictEqual(response.body, { message: 'foo' })
    } finally {
      await service.close()
    }
  })

  it('should be able to use both \'hapi\' plugin prefix and \'router\' plugin prefix', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'hapi', 'router-hapi'],
      hapi: {
        server: {
          port: 3000,
        },
      },
      'router-hapi': {
        prefix: 'foo.bar',
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artefacts/actions'),
          prefix: 'baz.foo',
        },
      },
    })

    await service.connect()

    try {
      const response = await request({
        json: true,
        method: 'POST',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/foo/bar/baz/foo/echo',
        body: { message: 'foo' },
      })

      strictEqual(response.statusCode, 200)
      deepStrictEqual(response.body, { message: 'foo' })
    } finally {
      await service.close()
    }
  })

  it('should be able to pass custom options to hapi route', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'hapi', 'router-hapi'],
      hapi: {
        server: {
          port: 3000,
        },
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artefacts/actions'),
        },
      },
    })

    await service.connect()

    try {
      const response = await request({
        method: 'POST',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/hapi-raw-body',
        body: '{"status":"😿"}',
      })

      strictEqual(response.body, '{"status":"😿"}')
      strictEqual(response.statusCode, 200)
    } finally {
      await service.close()
    }
  })

  describe('should be able to use hapi\'s plugins', () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'hapi', 'router-hapi'],
      hapi: {
        server: {
          port: 3000,
        },
        views: {
          engines: {
            hbs: handlebars,
          },
          path: resolve(__dirname, '../artefacts/templates'),
        },
      },
      'router-hapi': {
        prefix: 'foo.bar',
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artefacts/actions'),
        },
      },
    })

    beforeAll(() => service.connect())
    afterAll(() => service.close())

    it('should be able to send html view', async () => {
      const options = {
        json: true,
        method: 'post',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/foo/bar/view',
        body: {
          title: 'title',
          content: 'content',
        },
      }

      const response = await request(options)

      strictEqual(response.statusCode, 200)
      strictEqual(response.headers['content-type'], 'text/html; charset=utf-8')
      strictEqual(typeof response.body, 'string')

      const page = cheerio.load(response.body)

      strictEqual(page('title')?.html()?.trim(), options.body.title)
      strictEqual(page('div#content')?.html()?.trim(), options.body.content)
    })

    it('should be able to redirect', async () => {
      const options = {
        json: true,
        method: 'get',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/foo/bar/redirect',
      }

      const response = await request(options)

      strictEqual(response.statusCode, 200)
      deepStrictEqual(response.body, { redirected: true })
    })

    it('should be able to redirect', async () => {
      const options = {
        method: 'get',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/foo/bar/external-redirect',
      }

      const response = await request(options)

      strictEqual(response.statusCode, 200)
      strictEqual(typeof response.body, 'string')
    })
  })
})
