import { strict as assert } from 'assert'
import { Microfleet } from '@microfleet/core'

describe('Validator suite', () => {
  let service: Microfleet

  it('no `validator` plugin, it emits an error or throws', function test() {
    service = new Microfleet({ name: 'tester', plugins: [] })
    assert(!service.validator)
  })

  it('validator inits relative schema paths', function test() {
    assert.doesNotThrow(() => {
      service = new Microfleet({
        name: 'tester',
        plugins: ['validator'],
        validator: { schemas: ['./fixtures'] },
      })
    })

    assert(service.validator.ajv.getSchema('test-schema'))
    assert(service.validator.ajv.getSchema('config'))
  })

  it('validator exposes validate methods on the service', function test() {
    const { validator } = service
    assert(validator.validate)
    assert(validator.validateSync)
    assert(typeof validator.validate === 'function')
    assert(typeof validator.validateSync === 'function')
  })

  it('validator throw on invalid config when `config` schema is present', function test() {
    assert.throws(() => {
      service = new Microfleet({
        name: 'tester',
        plugins: ['validator'],
        validator: { schemas: ['./fixtures'] },
        invalid: 'mwhaha',
      })
    })
  })

  it('should be able to load config as object', () => {
    assert.doesNotThrow(() => {
      service = new Microfleet({
        name: 'tester',
        plugins: ['validator'],
        validator: {
          schemas: ['./fixtures'],
          ajv: {
            coerceTypes: true,
          },
        },
      })
    })

    assert(service.validator.ajv.getSchema('test-schema'))
    assert.strictEqual(service.validator.validateSync('test-types-schema', '1').doc, '1')
    assert(service.validator.ajv.getSchema('config'))
  })
})
