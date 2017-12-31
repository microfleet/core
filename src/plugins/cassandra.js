// @flow

/**
 * Project deps
 * @private
 */
const is = require('is');
const assert = require('assert');
const { NotPermittedError } = require('common-errors');
const { PluginsTypes } = require('../constants');
const _require = require('../utils/require');

/**
 * Plugin Name
 * @type {String}
 */
exports.name = 'cassandra';

/**
 * Plugin Type
 * @type {String}
 */
exports.type = PluginsTypes.database;

function factory(Cassandra, config) {
  const { models } = config.service;

  if (is.string(models)) {
    const client = Cassandra;

    return Cassandra
      .setDirectory(models)
      .bindAsync(config.client)
      .return(client);
  }

  const client = Cassandra.createClient(config.client);

  return client
    .connectAsync()
    .return(Object.keys(models))
    .map(modelName => client.loadSchemaAsync(modelName, models[modelName]))
    .return(client);
}

exports.attach = function attachCassandra(config: Object): PluginInterface {
  const service = this;
  const Cassandra = _require('express-cassandra');

  if (is.fn(service.validateSync)) {
    assert.ifError(service.validateSync('cassandra', config).error);
  }

  function connectCassandra() {
    if (service._cassandra) {
      throw new NotPermittedError('Cassandra was already started');
    }

    return factory(Cassandra, config)
      .tap((cassandra) => {
        service._cassandra = cassandra;
        service.emit('plugin:connect:cassandra', cassandra);
      });
  }

  function disconnectCassandra() {
    if (!service._cassandra) {
      throw new NotPermittedError('Cassandra was not started');
    }

    const { _cassandra: cassandra } = service;

    return cassandra
      .closeAsync()
      .tap(() => {
        service._cassandra = null;
        service.emit('plugin:close:cassandra');
      });
  }

  return {
    connect: connectCassandra,
    close: disconnectCassandra,
  };
};
