const Errors = require('common-errors');
const path = require('path');

const { ActionTransport } = require('../../../..');
require('../../../config');

const name = 'tester';
const plugins = ['logger', 'validator', 'opentracing', 'amqp', 'router'];
const actionsPath = path.resolve(__dirname, '../../helpers/actions');

const failedActionEmulator = [{
  point: 'preHandler',
  async handler(request) {
    const { failAtRetryCount } = request.params;
    const { headers } = request.headers;
    const retryCount = headers['x-retry-count'] || 0;
    if (retryCount <= failAtRetryCount) {
      throw new Errors.ConnectionError('Fake connection error first three times');
    }
    return [request];
  },
}];

const basicSetupConfig = {
  name,
  plugins,
  amqp: global.SERVICES.amqp,
  router: {
    routes: {
      transports: [
        ActionTransport.amqp,
      ],
    },
  },
};

const withEnabledRouting = {
  name,
  plugins,
  amqp: {
    ...global.SERVICES.amqp,
    router: {
      enabled: true,
      prefix: '',
    },
  },
  router: {
    extensions: { register: [] },
    routes: {
      directory: actionsPath,
      transports: [ ActionTransport.amqp ],
    },
  },
};

const withAmqpRouterPrefixSpecified = {
  name,
  plugins,
  amqp: {
    ...global.SERVICES.amqp,
    router: {
      enabled: true,
      prefix: 'amqp-prefix',
    },
  },
  router: {
    extensions: { register: [] },
    routes: {
      directory: actionsPath,
      transports: [ ActionTransport.amqp ],
    },
  },
};

const withRetryAndAmqpRouterPrefixSpecified = {
  name,
  plugins,
  amqp: {
    transport: {
      ...global.SERVICES.amqp.transport,
      queue: 'test-queue',
      bindPersistantQueueToHeadersExchange: true,
      neck: 10,
    },
    router: {
      enabled: true,
      prefix: 'amqp-prefix',
    },
    retry: {
      enabled: true,
      min: 100,
      max: 30 * 60 * 1000,
      factor: 1.2,
      maxRetries: 3, // 3 attempts only
      predicate(error, actionName) {
        if (actionName === 'echo') {
          return false;
        }

        return true;
      },
    },
  },
  router: {
    extensions: {
      enabled: ['preHandler'],
      register: [failedActionEmulator]
    },
    routes: {
      directory: actionsPath,
      transports: [ ActionTransport.amqp ],
    },
  },
};

const withRetryAndAmqpRouterPrefixAndCommonRouterPrefixSpecified = {
  name,
  plugins,
  amqp: {
    transport: {
      ...global.SERVICES.amqp.transport,
      queue: 'test-queue',
      bindPersistantQueueToHeadersExchange: true,
      neck: 10,
    },
    router: {
      enabled: true,
      prefix: 'amqp-prefix',
    },
    retry: {
      enabled: true,
      min: 100,
      max: 30 * 60 * 1000,
      factor: 1.2,
      maxRetries: 3, // 3 attempts only
      predicate(error, actionName) {
        if (actionName === 'router-prefix.echo') {
          return false;
        }

        return true;
      },
    },
  },
  router: {
    extensions: {
      enabled: ['preHandler'],
      register: [failedActionEmulator]
    },
    routes: {
      prefix: 'router-prefix',
      directory: actionsPath,
      transports: [ ActionTransport.amqp ],
    },
  },
};

module.exports = {
  basicSetupConfig,
  withEnabledRouting,
  withAmqpRouterPrefixSpecified,
  withRetryAndAmqpRouterPrefixSpecified,
  withRetryAndAmqpRouterPrefixAndCommonRouterPrefixSpecified,
};
