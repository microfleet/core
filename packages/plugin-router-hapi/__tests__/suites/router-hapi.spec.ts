import { strictEqual, deepStrictEqual } from 'assert'
import { resolve } from 'path'
import { all } from 'bluebird'
import cheerio from 'cheerio'
import { fetch, getGlobalDispatcher } from 'undici'

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
          directory: resolve(__dirname, '../artifacts/actions'),
        },
      },
    })

    await service.connect()

    const uri = 'http://0.0.0.0:3000/echo'
    const options = {
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({ message: 'foo' }),
    }

    try {
      await all([
        fetch(uri, options).then(async (response) => {
          strictEqual(response.status, 200)
          deepStrictEqual(await response.json(), { message: 'foo' })
        }),
        fetch('http://0.0.0.0:3000/not-found', options).then(async (response) => {
          strictEqual(response.status, 404)
          const body: any = await response.json()
          strictEqual(body.name, 'NotFoundError')
          deepStrictEqual(body.message, 'Not Found: "route "not-found" not found"')
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
          directory: resolve(__dirname, '../artifacts/actions'),
          prefix: 'foo.bar',
        },
      },
    })

    await service.connect()

    try {
      const response = await fetch('http://0.0.0.0:3000/foo/bar/echo', {
        method: 'POST',
        body: JSON.stringify({ message: 'foo' }),
      })

      strictEqual(response.status, 200)
      const body = await response.json()
      deepStrictEqual(body, { message: 'foo' })
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
      routerHapi: {
        prefix: 'foo.bar',
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
        },
      },
    })

    await service.connect()

    try {
      const response = await fetch('http://0.0.0.0:3000/foo/bar/echo', {
        method: 'POST',
        body: JSON.stringify({ message: 'foo' }),
      })

      strictEqual(response.status, 200)
      const body = await response.json()
      deepStrictEqual(body, { message: 'foo' })
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
      routerHapi: {
        prefix: 'foo.bar',
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
          prefix: 'baz.foo',
        },
      },
    })

    await service.connect()

    try {
      const response = await fetch('http://0.0.0.0:3000/foo/bar/baz/foo/echo', {
        method: 'POST',
        body: JSON.stringify({ message: 'foo' }),
      })

      strictEqual(response.status, 200)
      const body = await response.json()
      deepStrictEqual(body, { message: 'foo' })
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
          directory: resolve(__dirname, '../artifacts/actions'),
        },
      },
    })

    await service.connect()

    try {
      const response = await fetch('http://0.0.0.0:3000/hapi-raw-body', {
        method: 'POST',
        body: '{"status":"😿"}',
      })

      strictEqual(await response.text(), '{"status":"😿"}')
      strictEqual(response.status, 200)
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
          path: resolve(__dirname, '../artifacts/templates'),
        },
      },
      routerHapi: {
        prefix: 'foo.bar',
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
        },
      },
    })

    beforeAll(() => service.connect())
    afterAll(() => service.close())

    it('should be able to send html view', async () => {
      const options = {
        method: 'post',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          title: 'title',
          content: 'content',
        }),
      }

      const response = await fetch('http://0.0.0.0:3000/foo/bar/view', options)

      strictEqual(response.status, 200)
      strictEqual(response.headers.get('content-type'), 'text/html; charset=utf-8')
      const body = await response.text()

      const page = cheerio.load(body)

      strictEqual(page('title')?.html()?.trim(), 'title')
      strictEqual(page('div#content')?.html()?.trim(), 'content')
    })

    it('should be able to redirect', async () => {
      const response = await fetch('http://0.0.0.0:3000/foo/bar/redirect')

      strictEqual(response.status, 200)
      const body = await response.json()
      deepStrictEqual(body, { redirected: true })
    })

    it('should be able to redirect', async () => {
      const response = await fetch('http://0.0.0.0:3000/foo/bar/external-redirect')

      strictEqual(response.status, 200)
      const body = await response.text()
      strictEqual(/google/.test(body), true)
    })

    it('validation error is serialized including the code', async () => {
      const response = await fetch('http://0.0.0.0:3000/foo/bar/validation')

      strictEqual(response.status, 400)
      const body = await response.json()
      deepStrictEqual(body, {
        name: 'ValidationError',
        error: 'Bad Request',
        statusCode: 400,
        message: 'first: sample',
        code: 'E_FIRST'
      })
    })
  })

  afterAll(async () => {
    await getGlobalDispatcher().close()
  })
})
