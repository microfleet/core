const Promise = require('bluebird');
const Errors = require('common-errors');
const AMQPTransport = require('ms-amqp-transport');
const AMQPSchema = require('ms-amqp-transport/schema.json');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

exports.name = 'amqp';

function scanRoutes(directory, prefix) {
  if (!fs.existsSync(directory)) {
    throw new Errors.ArgumentError('directory', new Errors.Error(`${directory} does not exist`));
  }

  return glob.sync('**/*.js', { cwd: directory }).reduce((acc, file) => {
    const route = `${prefix}.${path.basename(file.replace(/\//g, '.'), '.js')}`;
    acc[route] = require(path.join(directory, file));
    return acc;
  }, {});
}

/**
 * Initializes routes
 * @param  {Object} config
 */
function initRoutes(service, config) {
  // use automatic directory traversal
  if (typeof config.postfix === 'string') {
    // scan listen routes
    service._routes = scanRoutes(config.postfix, config.prefix);
    // allow ms-amqp-transport to discover us
    config.listen = Object.keys(service._routes);
    return;
  }

  // setup listen routes
  const postfixes = Object.keys(config.postfix);
  const prefix = config.prefix;
  const routes = service._routes = {};

  config.listen = postfixes.map(postfix => {
    const routingKey = [prefix, config.postfix[postfix]].join('.');
    routes[routingKey] = require(`${process.cwd()}/actions/${postfix}.js`);
    routes[routingKey].__validation = postfix;
    return routingKey;
  });
}

/**
 * Dynamically defines router for amqp service
 * @param  {Mservice} service
 */
function attachRouter(service, conf) {
  const routes = service._routes;
  const onComplete = conf.onComplete;
  const prefixLength = conf.prefix.length + 1;

  /**
   * AMQP message router
   * @param  {Object} message
   * @param  {Object} headers
   * @param  {Object} actions
   * @return {Promise}
   */
  service.router = function router(message, headers, actions, next) {
    const time = process.hrtime();
    const route = headers.routingKey;
    const action = routes[route];
    const actionName = route;

    let promise = Promise.bind(service);
    if (!action) {
      promise = promise.throw(new Errors.NotImplementedError(route));
    } else {
      promise = promise
        .return([action.__validation || actionName.slice(prefixLength), message])
        .spread(service.validate)
        .then(action);
    }

    // this is a hook to handle QoS or any other events
    if (onComplete) {
      promise = promise
        .reflect()
        .then(fate => {
          const err = fate.isRejected() ? fate.reason() : null;
          const data = fate.isFulfilled() ? fate.value() : null;
          return [err, data, actionName, actions];
        })
        .spread(onComplete);
    }

    // if we have an error
    promise = promise
      .reflect()
      .then(function auditLog(fate) {
        const execTime = process.hrtime(time);
        const meta = {
          message,
          headers,
          latency: execTime[0] * 1000 + (+(execTime[1] / 1000000).toFixed(3)),
        };

        if (fate.isRejected()) {
          const reason = fate.reason();
          const err = typeof reason.toJSON === 'function' ? reason.toJSON() : reason.toString();
          service.log.error(meta, 'Error performing operation', err);
          throw reason;
        }

        const response = fate.value();
        service.log.info(meta, 'completed operation', this._config.debug ? response : '');
        return response;
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
    validator.ajv.addSchema(AMQPSchema);
    const { error } = service.validateSync('amqp', conf);
    if (error) {
      throw error;
    }
  }

  if (conf.initRoutes === true) {
    initRoutes(service, conf);
  }

  if (conf.initRouter === true) {
    attachRouter(service, conf);
  }

  let logger;
  if (service._log) {
    const log = service._log;
    logger = function logAMQP(...args) {
      log.info(...args);
    };
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
        .tap(amqp => {
          if (logger) {
            amqp.on('log', logger);
          }

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
          if (logger) {
            amqp.removeListener('log', logger);
          }

          service._amqp = null;
          service.emit('plugin:close:amqp');
        });
    },

  };
};
