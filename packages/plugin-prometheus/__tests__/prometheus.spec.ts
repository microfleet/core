import assert from 'node:assert/strict'
import { fetch, getGlobalDispatcher } from 'undici'
import { Microfleet } from '@microfleet/core'

describe('prometheus plugin', function testSuite() {
  let service: Microfleet

  it('should be able to throw error if plugin is not included', async () => {
    service = new Microfleet({ name: 'micro', plugins: [] })
    await service.register()
    assert(!service.prometheus)
  })

  it('should be able to initialize', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'prometheus'],
    })

    await service.register()
    assert.ok(service.prometheus)
  })

  it('should be able to provide metrics', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'prometheus'],
    })

    await service.connect()

    const res = await fetch('http://0.0.0.0:9102/metrics')
    const text = await res.text()
    assert.ok(text.includes('TYPE application_version_info gauge'))
    assert.ok(text.includes('TYPE microfleet_request_duration_milliseconds histogram'))
  })

  afterEach(() => (
    service && service.close()
  ))

  afterAll(async () => {
    await getGlobalDispatcher().close()
  })
})
