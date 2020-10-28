const { defaultsDeep } = require('lodash');
const path = require('path');

const { ActionTransport } = require('../../..');

const withResponseValidateAction = (name, extra = {}) => {
  const config = {
    name,
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
    http: {
      server: {
        attachSocketio: true,
        handler: 'hapi',
      },
    },
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
        ],
      },
      extensions: { register: [] },
    },
    validator: { schemas: [path.resolve(__dirname, './schemas')] },
  };

  return defaultsDeep(config, extra);
};

module.exports = {
  withResponseValidateAction,
};
