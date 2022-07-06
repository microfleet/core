import assert from 'assert'
import { fetch } from 'undici'

import { Microfleet } from '@microfleet/core'

describe('prometheus plugin', function testSuite() {
  let service: Microfleet

  it('should be able to throw error if plugin is not included', async () => {
    service = new Microfleet({ name: 'micro', plugins: [] })
    assert(!service.prometheus)
  })

  it('should be able to initialize', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'prometheus'],
    })

    assert.ok(service.prometheus)
  })

  it('should be able to provide metrics', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'prometheus'],
    })

    await service.connect()

    const text = await (await fetch('http://0.0.0.0:9102/metrics')).text()
    assert.ok(text.includes('TYPE application_version_info gauge'))
    assert.ok(text.includes('TYPE microfleet_request_duration_milliseconds histogram'))
  })

  afterEach(() => (
    service && service.close()
  ))
})
