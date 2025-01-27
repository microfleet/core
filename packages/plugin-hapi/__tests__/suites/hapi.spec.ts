import { strictEqual, deepStrictEqual } from 'node:assert'
import { test } from 'node:test'
import { Microfleet } from '@microfleet/core'
import { resolve } from 'node:path'
import { io as SocketIOClient } from 'socket.io-client'

test('plugin-hapi', async (t) => {
  await t.test('should starts \'hapi\' http server when plugin is included', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'hapi'],
    })

    const [server] = await service.connect()

    strictEqual(server, service.hapi)
    strictEqual(service.hapi.info.started !== undefined, true)
    strictEqual(service.hapi.info.started > 0, true)

    await service.close()

    strictEqual(service.hapi.info.started !== undefined, true)
    strictEqual(service.hapi.info.started === 0, true)
  })

  await t.test('should be able to attach \'socketio\' plugin', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: [
        'validator',
        'logger',
        'router',
        'hapi',
        'socketio',
        'router-socketio',
      ],
      hapi: {
        attachSocketio: true,
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
    const client = SocketIOClient('http://0.0.0.0:3000')

    await service.connect()

    await new Promise<void>((resolve, reject) => {
      client.on('error', reject)
      client.emit('echo', { message: 'foo' }, (error: unknown, response: Record<string, unknown>) => {
        strictEqual(error, null)
        deepStrictEqual(response, { message: 'foo' })
        resolve()
      })
    })

    client.close()
    await service.close()
  })
})
