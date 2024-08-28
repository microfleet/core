import { strictEqual, ok } from 'node:assert'
import { resolve } from 'path'
import { Microfleet } from '@microfleet/core'

describe('Service Request', () => {
  let service: Microfleet

  afterAll(async () => {
    await service?.close()
  })

  it('should be able to manage reply headers', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: [
        'validator',
        'logger',
        'router'
      ],
      // @todo one style for pass directory?
      validator: { schemas: ['../artifacts/schemas'] },
      logger: {
        defaultLogger: false,
      },
      router: {
        routes: {
          // @todo one style for pass directory?
          directory: resolve(__dirname, '../artifacts/actions'),
          prefix: 'action',
        },
      },
    })

    await service.connect()

    const simpleResponse = await service.dispatch('headers', { params: {} }, { simpleResponse: true })
    ok(simpleResponse.response, 'success')

    const notSimpleResponse = await service.dispatch('headers', { params: {} }, { simpleResponse: false })
    const { headers, data } = notSimpleResponse
    strictEqual(data.response, 'success')
    strictEqual(headers.get('x-add'), 'added')
    strictEqual(headers.get('x-override'), 'new')
    strictEqual(headers.get('x-add-remove'), undefined)
    // http exception not applied when set through internal transport
    strictEqual(headers.get('set-cookie'), 'bar=2')
    strictEqual(headers.get('x-non-ascii'), '👾')
    strictEqual(headers.get('x-empty'), '')
  })
})
