import { test } from 'node:test'
import { strictEqual, strict } from 'node:assert'
import { Microfleet } from '@microfleet/core'
import { Server as SocketIOStatic } from 'socket.io'
import { Transport, Adapter } from 'ms-socket.io-adapter-amqp'

test('plugin-socketio', async (t) => {
  await t.test('should not be able to create socket.io instance when plugin is not included', async () => {
    const service = new Microfleet({ name: 'tester', plugins: [] })
    await service.register()
    strictEqual(service.socketio, undefined)
  })

  await t.test('should create socket.io instance when plugin is included', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'socketio'],
    })

    await service.register()
    strictEqual(service.socketio instanceof SocketIOStatic, true)
  })

  await t.test('should be able to set up AMQP adapter', async () => {
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
