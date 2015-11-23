const Promise = require('bluebird');
const Errors = require('common-errors');
const AMQPTransport = require('ms-amqp-transport');
const AMQPSchema = require('ms-amqp-transport/schema.json');

exports.name = 'amqp';

/**
 * Initializes routes
 * @param  {Object} config
 */
function initRoutes(service, config) {
  // setup listen routes
  const postfixes = Object.keys(config.postfix);
  const prefix = config.prefix;
  const actions = service._actions = {};
  const routes = service._routes = {};

  config.amqp.listen = postfixes.map(postfix => {
    const route = config.postfix[postfix];
    actions[route] = postfix;
    routes[route] = require(`${process.cwd()}/actions/${postfix}.js`);
    return [ prefix, route ].join('.');
  });
}

/**
 * Dynamically defines router for amqp service
 * @param  {Mservice} service
 */
function attachRouter(service, conf) {
  const actionNames = this._actions;
  const routes = this._routes;
  const onComplete = conf.onComplete;

  /**
   * AMQP message router
   * @param  {Object} message
   * @param  {Object} headers
   * @param  {Object} actions
   * @return {Promise}
   */
  service.router = function router(message, headers, actions, next) {
    const time = process.hrtime();
    const route = headers.routingKey.split('.').pop();
    const action = routes[route];
    const actionName = actionNames[route];

    let promise;
    if (!action) {
      promise = Promise.reject(new Errors.NotImplementedError(route));
    } else {
      promise = Promise.bind(service)
        .then(function validateMiddleware() {
          return this.validate(actionName, message);
        })
        .then(action);
    }

    // this is a hook to handle QoS or any other events
    if (onComplete) {
      promise = promise
        .then(function success(data) {
          return onComplete(null, data, actionName, actions);
        })
        .catch(function err(error) {
          return onComplete(error, null, actionName, actions);
        });
    }

    // if we have an error
    promise = promise.finally(function auditLog(response) {
      const execTime = process.hrtime(time);
      const meta = {
        message,
        headers,
        latency: execTime[0] * 1000 + (+(execTime[1] / 1000000).toFixed(3)),
      };

      if (response instanceof Error) {
        service.log.error(meta, 'Error performing operation', response);
      } else {
        service.log.info(meta, 'completed operation');
      }
    });

    if (typeof next === 'function') {
      return promise.asCallback(next);
    }

    return promise;
  };
}

/**
 * Attaches plugin to the Mservice class
 * @param  {Object} conf
 */
exports.attach = function attachPlugin(conf = {}) {
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

  if (conf.initRoutes === true) {
    initRoutes(service, conf);
  }

  if (conf.initRouter === true) {
    attachRouter(service, conf);
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
        .connect(conf, service.router)
        .tap(function attachAMQP(amqp) {
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

      return service._amqp
        .close()
        .tap(function cleanupRefs() {
          service._amqp = null;
          service.emit('plugin:close:amqp');
        });
    },

  };
};
