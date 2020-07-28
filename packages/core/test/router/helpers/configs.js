const { defaultsDeep } = require('lodash');
const path = require('path');

const { ActionTransport } = require('../../..');

const withResponseValidateAction = (name, extra = {}) => {
  const config = {
    name: name,
    amqp: {
      transport: {
        connection: {
          host: 'rabbitmq',
        },
      },
      router: {
        enabled: true,
      },
    },
    http: {
      server: {
        attachSocketIO: true,
        handler: 'hapi',
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
        directory: path.resolve(__dirname, './actions'),
        enabled: {
          'validate-response': 'validate-response',
          'validate-response-skip': 'validate-response-skip',
          'validate-response-without-schema': 'validate-response-without-schema',
        },
        prefix: 'action',
        transports: [
          ActionTransport.amqp,
          ActionTransport.socketIO,
          ActionTransport.http,
        ]
      },
      extensions: { register: [] },
    },
    socketIO: {
      router: {
        enabled: true,
      },
    },
    validator: { schemas: [ path.resolve(__dirname, './schemas')] },
  }

  return defaultsDeep(config, extra)
}

module.exports = {
  withResponseValidateAction
}
