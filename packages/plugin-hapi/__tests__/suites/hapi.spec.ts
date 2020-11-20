import { strictEqual, deepStrictEqual } from 'assert'
import { Microfleet } from '@microfleet/core'
import { resolve } from 'path'
import * as SocketIOClient from 'socket.io-client'

describe('@microfleet/plugin-hapi', () => {
  // @todo add missing tests for hapi plugins without using plugin-router
  // (it tested in plugin-router-hapi now)

  it('should starts \'hapi\' http server when plugin is included', async () => {
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

  it('should be able to attach \'socketio\' plugin', async () => {
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

    await new Promise((resolve, reject) => {
      client.on('error', reject)
      client.emit('echo', { message: 'foo' }, (error: Record<string, unknown> | null, response: Record<string, unknown>) => {
        client.close()

        strictEqual(error, null)
        deepStrictEqual(response, { message: 'foo' })

        service.close().then(resolve).catch(reject)
      })
    })
  })
})
