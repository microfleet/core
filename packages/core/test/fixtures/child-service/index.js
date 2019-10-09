const path = require('path');
const _ = require('ts-node/register');

const { Microfleet: Mservice, routerExtension, ActionTransport } = require('../../../src');

const service = new Mservice({
  name: 'tester',
  sigterm: true,
  amqp: {
    transport: {
      connection: {
        host: 'rabbitmq',
      },
    },
    router: {
      enabled: true,
      prefix: 'amqp',
    },
  },
  http: {
    server: {
      attachSocketIO: true,
      handler: 'hapi',
      port: 0,
    },
    router: {
      enabled: true,
    },
  },
  logger: {
    defaultLogger: true,
  },
  plugins: ['validator', 'logger', 'router', 'amqp', 'http', 'socketIO'],
  router: {
    routes: {
      directory: path.resolve(__dirname, '../../router/helpers/actions'),
      prefix: 'action',
      setTransportsAsDefault: true,
      transports: [
        ActionTransport.amqp,
        ActionTransport.http,
        ActionTransport.socketIO,
        ActionTransport.internal,
      ],
      enabledGenericActions: ['health'],
    },
    extensions: {
      enabled: [ 'postRequest'],
      register: [],
    },
  },
  socketIO: {
    router: {
      enabled: true,
    },
  },
  validator: { schemas: ['../../router/helpers/schemas'] },
});


(async () => {
  service.on('ready', () => {
    process.send({
      ready: true,
      port: service.http.info.port,
    });
  });

  await service.connect();
})();
