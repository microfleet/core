import { strictEqual, strict } from 'assert'
import { Microfleet } from '@microfleet/core'
import { Server as SocketIOStatic } from 'socket.io'
import { Transport, Adapter } from 'ms-socket.io-adapter-amqp'

describe('@microfleet/plugin-socketio', () => {
  it('should not be able to create socket.io instance when plugin is included', async () => {
    const service = new Microfleet({ name: 'tester', plugins: [] })
    await service.register()
    strictEqual(service.socketio, undefined)
  })

  it('should create socket.io instance when plugin is included', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'socketio'],
    })

    await service.register()
    strictEqual(service.socketio instanceof SocketIOStatic, true)
  })

  it('should be able to set up AMQP adapter', async () => {
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

    await service.register()
    strict(service.socketio.sockets.adapter instanceof Adapter)
    strict(service.socketio.sockets.adapter.transport instanceof Transport)
  })
})
