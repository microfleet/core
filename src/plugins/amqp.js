// @flow
import type { PluginInterface } from '../types';

/**
 * Project deps
 * @private
 */
const Promise = require('bluebird');
const Errors = require('common-errors');
const cloneDeep = require('lodash/cloneDeep');
const assert = require('assert');
const is = require('is');
const _require = require('../utils/require');

const { ActionTransport, PluginsTypes } = require('../constants');
const getAMQPRouterAdapter = require('./amqp/router/adapter');
const verifyPossibility = require('./router/verifyAttachPossibility');

/**
 * Plugin Name
 * @type {String}
 */
exports.name = 'amqp';

/**
 * Plugin Type
 * @type {String}
 */
exports.type = PluginsTypes.transport;

/**
 * Attaches plugin to the MService class.
 * @param {Object} config - AMQP plugin configuration.
 */
exports.attach = function attachAMQPPlugin(config: Object): PluginInterface {
  const service = this;

  const AMQPTransport = _require('ms-amqp-transport');
  const AMQPSchema = require('ms-amqp-transport/schema.json');

  if (is.fn(service.validateSync)) {
    const transportSchema = cloneDeep(AMQPSchema);
    transportSchema.$id = 'amqp.transport';
    service.validator.ajv.addSchema(transportSchema);
    assert.ifError(service.validateSync('amqp', config).error);
    assert.ifError(service.validateSync('amqp.transport', config.transport).error);
  }

  if (config.router.enabled === true) {
    verifyPossibility(service.router, ActionTransport.amqp);
    service.AMQPRouter = getAMQPRouterAdapter(service.router, config);
    // allow ms-amqp-transport to discover routes
    config.transport.listen = Object.keys(service.router.routes.amqp);
  }

  // logger
  const logger = service._log && service._log.child({ namespace: 'ms-amqp-transport' });

  return {

    /**
     * Generic AMQP Connector.
     * @returns {Promise<AMQPTransport>} Opens connection to AMQP.
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
        }, service.AMQPRouter)
        .tap((amqp) => {
          service._amqp = amqp;
          service.emit('plugin:connect:amqp', amqp);
        });
    },

    /**
     * Generic AMQP disconnector.
     * @returns {Promise<void>} Closes connection to AMQP.
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
};
