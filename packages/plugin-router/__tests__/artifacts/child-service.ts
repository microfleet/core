import { Microfleet } from '@microfleet/core'
import { withResponseValidateAction } from './utils'
import '@microfleet/plugin-amqp'

const service = new Microfleet(withResponseValidateAction('tester', {
  sigterm: true,
  routerAmqp: {
    prefix: 'amqp',
  },
  hapi: {
    server: {
      port: parseInt(process.argv[2], 10) || 8000,
    },
  },
  router: {
    routes: {
      enabledGenericActions: ['health'],
    },
  },
}));

(async () => {
  try {
    process.stdout.write(`${JSON.stringify(process.argv)}\n`)
    await service.connect()
    process.stdout.write(`${JSON.stringify({ childServiceReady: true, amqp: service.config.amqp.transport.exchange })}\n`)
  } catch (e: any) {
    /* eslint-disable-next-line no-console */
    console.error(e)
    process.exit(128)
  }
})()
