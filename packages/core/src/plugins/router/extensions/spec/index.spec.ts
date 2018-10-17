import assert = require('assert')
import Bluebird = require('bluebird')
import { NotSupportedError } from 'common-errors'
import Extensions, { IExtensionsConfig } from '..'

describe('router: extensions', () => {
  it('should be able to auto register extension', async () => {
    const config: IExtensionsConfig = {
      enabled: [
        'preHandler',
        'postHandler',
      ],
      register: [
        [
          { point: 'postHandler', handler: Bluebird.resolve },
        ],
      ],
    }

    const extensions = new Extensions(config)

    assert.doesNotThrow(() => {
      extensions.register('preHandler', () => Bluebird.reject(new Error('q')))
    })

    await extensions.exec('postHandler', ['foo'])
  })

  it('should not be able to execute unknown extension', async () => {
    const extensions = new Extensions()

    const inspection = await extensions
      .exec('postPreHandler', ['foo'])
      .reflect()

    const error = inspection.reason()
    assert(error instanceof NotSupportedError)
    assert.equal(error.message, 'Not Supported: postPreHandler')
  })
})
