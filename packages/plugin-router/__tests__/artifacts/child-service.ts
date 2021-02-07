import { resolve } from 'path'
import { Microfleet } from '@microfleet/core'

const service = new Microfleet({
  name: 'tester',
  plugins: [
    'validator',
    'logger',
    'router',
    'amqp',
    'router-amqp',
    'http',
    'router-http',
    'socketio',
    'router-socketio',
  ],
  sigterm: true,
  'router-amqp': {
    prefix: 'amqp',
  },
  http: {
    server: {
      attachSocketio: true,
      handler: 'hapi',
      port: parseInt(process.argv[2], 10),
    },
  },
  router: {
    routes: {
      directory: resolve(__dirname, './actions'),
      prefix: 'action',
      enabledGenericActions: ['health'],
    },
  },
  validator: { schemas: ['./schemas'] },
});

(async () => {
  try {
    process.stdout.write(`${JSON.stringify(process.argv)}\n`)
    await service.connect()
    process.stdout.write(`${JSON.stringify({ childServiceReady: true })}\n`)
  } catch (e: any) {
    /* eslint-disable-next-line no-console */
    console.error(e)
    process.exit(128)
  }
})()
