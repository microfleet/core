import { strictEqual } from 'assert'
import { Microfleet } from '@microfleet/core'
import { resolve } from 'path'
import * as SocketIOClient from 'socket.io-client'

describe('@microfleet/plugin-router-socketio', () => {
  const service = new Microfleet({
    name: 'tester',
    plugins: [
      'validator',
      'logger',
      'socketio',
      'http',
      'router',
      'router-socketio'
    ],
    http: {
      server: {
        attachSocketio: true,
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

  it('should be able to attach socket.io transport to router (using http plugin)', () => {
    return new Promise((resolve, reject) => {
      const client = SocketIOClient('http://0.0.0.0:17003')

      client.on('error', reject)
      client.on('connect', () => {
        client.emit('echo', { message: 'foo' }, (error: any, response: any) => {
          strictEqual(error, null)
          strictEqual(response.message, 'foo')

          client.close()
          resolve()
        })
      })
    })
  })
})
