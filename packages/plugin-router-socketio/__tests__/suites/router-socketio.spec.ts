import { strictEqual } from 'assert'
import { Microfleet } from '@microfleet/core'
import { resolve } from 'path'
import { io as SocketIOClient } from 'socket.io-client'
import { once } from 'events'

describe('@microfleet/plugin-router-socketio', () => {
  const service = new Microfleet({
    name: 'tester',
    plugins: [
      'validator',
      'logger',
      'router',
      'socketio',
      'hapi',
      'router-socketio'
    ],
    hapi: {
      attachSocketio: true,
      server: {
        port: 17003,
      },
    },
    router: {
      routes: {
        directory: resolve(__dirname, '../artifacts/actions'),
      },
    },
  })

  beforeAll(() => service.connect())
  afterAll(() => service.close())

  it('should be able to attach socket.io transport to router (using http plugin)', async () => {
    const client = SocketIOClient('http://0.0.0.0:17003')
    await once(client, 'connect')
    await new Promise<void>((resolve) => {
      client.emit('echo', { message: 'foo' }, (error: any, response: any) => {
        strictEqual(error, null)
        strictEqual(response.message, 'foo')
        client.close()
        resolve()
      })
    })
  })
})
