const { defaultsDeep } = require('lodash');
const path = require('path');

const { ActionTransport } = require('../../..');

const withResponseValidateAction = (name, extra = {}) => {
  const config = {
    name: name,
    http: {
      server: {
        attachSocketio: true,
        handler: 'hapi',
      },
      router: {
        enabled: true,
      },
    },
    plugins: ['validator', 'logger', 'router', 'amqp', 'http', 'socketio', 'router-socketio', 'router-amqp'],
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
          ActionTransport.socketio,
          ActionTransport.http,
        ]
      },
      extensions: { register: [] },
    },
    validator: { schemas: [ path.resolve(__dirname, './schemas')] },
  }

  return defaultsDeep(config, extra)
}

module.exports = {
  withResponseValidateAction
}
