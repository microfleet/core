const { ActionTransport } = require('./../');
const _ = require('lodash');
const AMQPSchema = require('ms-amqp-transport/schema.json');
const AMQPTransport = require('ms-amqp-transport');
const assert = require('assert');
const Errors = require('common-errors');
const getAMQPRouterAdapter = require('./amqp/router/adapter');
const is = require('is');
const Promise = require('bluebird');
const verifyPossibility = require('./router/verifyAttachPossibility');

/**
 * Attaches plugin to the MService class
 *
 * @param  {Object} config
 */
function attachAMQPPlugin(config) {
  const service = this;
  let routerAdapter = null;

  if (is.fn(service.validateSync)) {
    const transportSchema = _.cloneDeep(AMQPSchema);
    transportSchema.id = 'amqp.transport';
    service.validator.ajv.addSchema(transportSchema);
    assert.ifError(service.validateSync('amqp', config).error);
    assert.ifError(service.validateSync('amqp.transport', config.transport).error);
  }

  if (config.router.enabled === true) {
    verifyPossibility(service.router, ActionTransport.amqp);
    routerAdapter = getAMQPRouterAdapter(service.router);
    // allow ms-amqp-transport to discover routes
    config.transport.listen = Object.keys(service.router.routes.amqp);
  }

  // logger
  const logger = service._log && service._log.child({ namespace: 'ms-amqp-transport' });

  return {
    /**
     * Generic AMQP Connector
     * @return {Function}
     */
    connect: function connectToAMQP() {
      if (service._amqp) {
        return Promise.reject(new Errors.NotPermittedError('amqp was already started'));
      }

      // if service.router is present - we will consume messages
      // if not - we will only create a client
      return AMQPTransport
        .connect({
          ...config.transport,
          log: logger || null,
        }, routerAdapter)
        .tap(amqp => {
          service._amqp = amqp;
          service.emit('plugin:connect:amqp', amqp);
          return amqp;
        });
    },

    /**
     * Generic AMQP disconnector
     * @return {Function}
     */
    close: function disconnectFromAMQP() {
      if (!service._amqp || !(service._amqp instanceof AMQPTransport)) {
        return Promise.reject(new Errors.NotPermittedError('amqp was not started'));
      }

      const amqp = service._amqp;
      return amqp.close()
        .tap(() => {
          service._amqp = null;
          service.emit('plugin:close:amqp');
        });
    },

  };
}

module.exports = {
  attach: attachAMQPPlugin,
  name: 'amqp',
};
