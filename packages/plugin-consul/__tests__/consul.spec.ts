import { Microfleet } from '@microfleet/core'

let service: Microfleet

test('prepares service', async () => {
  service = new Microfleet({
    name: 'consul-test',
    plugins: ['validator', 'logger', 'consul'],
    consul: {
      base: {
        host: 'consul',
      },
    },
    logger: {
      defaultLogger: true,
    },
  })
})

test('service launched', async () => {
  expect.assertions(2)

  expect(service.consul).toBeDefined()
  await service.connect()
  await expect(service.whenLeader()).resolves.toBe(true)
})

afterAll(async () => {
  if (service) await service.close()
})
