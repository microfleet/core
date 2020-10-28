const path = require('path');
const { Microfleet, ActionTransport } = require('../../..');

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
      directory: path.resolve(__dirname, '../../router/helpers/actions'),
      prefix: 'action',
      setTransportsAsDefault: true,
      transports: [
        ActionTransport.amqp,
        ActionTransport.http,
        ActionTransport.socketio,
        ActionTransport.internal,
      ],
      enabledGenericActions: ['health'],
    },
    extensions: {
      enabled: ['postRequest'],
      register: [],
    },
  },
  validator: { schemas: ['../../router/helpers/schemas'] },
});

(async () => {
  try {
    process.stdout.write(`${JSON.stringify(process.argv)}\n`);
    await service.connect();
    process.stdout.write(`${JSON.stringify({ childServiceReady: true })}\n`);
  } catch (e) {
    /* eslint-disable no-console */
    console.error(e);
    process.exit(128);
  }
})();
