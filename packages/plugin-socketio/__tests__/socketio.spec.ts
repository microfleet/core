import { strictEqual, strict } from 'assert'
import { Microfleet } from '@microfleet/core'
import { Server as SocketIOStatic } from 'socket.io'
import { Transport, Adapter } from 'ms-socket.io-adapter-amqp'

describe('@microfleet/plugin-socketio', () => {
  it('should not be able to create socket.io instance when plugin is included', () => {
    const service = new Microfleet({ name: 'tester', plugins: [] })

    strictEqual(service.socketio, undefined)
  })

  it('should create socket.io instance when plugin is included', () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'socketio'],
    })

    strictEqual(service.socketio instanceof SocketIOStatic, true)
  })

  it('should be able to set up AMQP adapter', () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'socketio'],
      socketio: {
        adapter: {
          name: 'amqp',
          options: {
            connection: {
              host: 'rabbitmq',
              port: 5672,
            },
          },
        },
      },
    })

    strict(service.socketio.sockets.adapter instanceof Adapter)
    strict(service.socketio.sockets.adapter.transport instanceof Transport)
  })
})
