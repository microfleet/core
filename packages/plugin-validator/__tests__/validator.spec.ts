import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Microfleet } from '@microfleet/core'

test('Validator suite', async (t) => {
  let service: Microfleet

  await t.test('no `validator` plugin, it emits an error or throws', () => {
    service = new Microfleet({ name: 'tester', plugins: [] })
    assert(!service.validator)
  })

  await t.test('validator inits relative schema paths', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator'],
      validator: { schemas: ['./fixtures'] },
    })
    await service.register()

    assert(service.validator.ajv.getSchema('test-schema'))
    assert(service.validator.ajv.getSchema('config'))
  })

  await t.test('validator exposes validate methods on the service', () => {
    const { validator } = service

    assert(validator.validate)
    assert(validator.validateSync)
    assert(typeof validator.validate === 'function')
    assert(typeof validator.validateSync === 'function')
  })

  await t.test('validator throw on invalid config when `config` schema is present', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator'],
      validator: { schemas: ['./fixtures'] },
      invalid: 'mwhaha',
    })

    await assert.rejects(service.register())
  })

  await t.test('should be able to load config as object', async () => {
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

    await service.register()

    assert(service.validator.ajv.getSchema('test-schema'))
    assert.strictEqual(service.validator.validateSync('test-types-schema', '1').doc, '1')
    assert(service.validator.ajv.getSchema('config'))
  })
})
