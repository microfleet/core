const Promise = require('bluebird');
const Errors = require('common-errors');
const AMQPTransport = require('ms-amqp-transport');
const AMQPSchema = require('ms-amqp-transport/schema.json');

exports.name = 'amqp';

exports.attach = function attachPlugin(conf) {
  const service = this;

  // optional validation with the plugin
  const validator = service._validator;
  if (validator && typeof validator === 'object') {
    // extend with external schema
    validator.validators.amqp = validator._initValidator(AMQPSchema, validator.schemaOptions);
    const isConfValid = service.validateSync('amqp', conf);
    if (isConfValid.error) {
      throw isConfValid.error;
    }
  }

  // connectors
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
        .connect(conf.amqp, service.router)
        .tap(function attachAMQP(amqp) {
          service._amqp = amqp;
          service.emit('plugin:connect:amqp', amqp);
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

      return service._amqp
        .close()
        .tap(function cleanupRefs() {
          service._amqp = null;
          service.emit('plugin:close:amqp');
        });
    },

  };
};
