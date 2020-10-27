import { strictEqual, deepStrictEqual } from 'assert'
import { Microfleet } from '@microfleet/core'
import { resolve } from 'path'
import * as SocketIOClient from 'socket.io-client'

describe('@microfleet/plugin-http', () => {
  it('should starts \'hapi\' http server when plugin is included', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'http'],
      http: {
        server: {
          handler: 'hapi',
        },
      },
    })

    const [server] = await service.connect()

    strictEqual(server, service.http)
    strictEqual(service.http.info.started !== undefined, true)
    strictEqual(service.http.info.started > 0, true)

    await service.close()

    strictEqual(service.http.info.started !== undefined, true)
    strictEqual(service.http.info.started === 0, true)
  })

  it('should be able to attach \'socketio\' plugin', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: [
        'validator',
        'logger',
        'router',
        'http',
        'socketio',
        'router-socketio',
      ],
      http: {
        server: {
          attachSocketio: true,
          handler: 'hapi',
        },
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artefacts/actions'),
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
