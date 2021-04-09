import { strictEqual } from 'assert'
import { Microfleet } from '@microfleet/core'
import { resolve } from 'path'
import { io as SocketIOClient } from 'socket.io-client'
import { once } from 'events'
import type * as _ from '@microfleet/plugin-router-socketio'
import type * as __ from '@microfleet/plugin-socketio'

describe('@microfleet/plugin-http', () => {
  it('should starts \'hapi\' http server when plugin is included', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'http'],
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
        'socketio',
        'http',
        'router-socketio',
      ],
      http: {
        server: {
          attachSocketio: true,
          port: 17004
        },
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
        },
      },
    })

    const client = SocketIOClient('http://0.0.0.0:17004')

    await Promise.all([
      service.connect(),
      once(client, 'connect')
    ])

    await new Promise<void>((resolve, reject) => {
      client.emit('echo', { message: 'foo' }, (error: Error | null, response: Record<string, unknown>) => {
        try {
          strictEqual(error, null)
          strictEqual(response.message, 'foo')
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })

    client.close()
    await service.close()
  })
})
