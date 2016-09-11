const Errors = require('common-errors');
const is = require('is');
const Promise = require('bluebird');
const _require = require('../utils/require');

function attachCassandra(config) {
  const service = this;
  const Cassandra = _require('express-cassandra');

  if (is.fn(service.validateSync)) {
    const isConfigValid = service.validateSync('cassandra', config);

    if (isConfigValid.error) {
      throw isConfigValid.error;
    }
  }

  let cassandra;

  function connectCassandra() {
    if (service._cassandra) { // eslint-disable-line no-underscore-dangle
      return Promise.reject(new Errors.NotPermittedError('cassandra was already started'));
    }

    return new Promise((resolve, reject) => {
      const models = config.service.models;

      function onConnect(error) {
        if (error) {
          reject(error);
        } else {
          service._cassandra = cassandra; // eslint-disable-line no-underscore-dangle
          service.emit('plugin:connect:cassandra', cassandra);
          resolve(cassandra);
        }
      }

      if (is.string(models)) {
        cassandra = Cassandra;
        cassandra
          .setDirectory(models)
          .bind(config.client, onConnect);
      } else if (is.object(models)) {
        cassandra = Cassandra.createClient(config.client);
        Object.keys(models)
          .forEach(modelName => cassandra.loadSchema(modelName, models[modelName]));

        cassandra.connect(onConnect);
      }
    });
  }

  function disconnectCassandra() {
    if (!service._cassandra) {
      return Promise.reject(new Errors.NotPermittedError('cassandra was not started'));
    }

    return new Promise((resolve, reject) => {
      cassandra.close((error) => {
        if (error) {
          reject(error);
        } else {
          service._cassandra = null; // eslint-disable-line no-underscore-dangle
          service.emit('plugin:close:cassandra');
          resolve();
        }
      });
    });
  }

  return {
    connect: connectCassandra,
    close: disconnectCassandra,
  };
}

module.exports = {
  attach: attachCassandra,
  name: 'cassandra',
};
