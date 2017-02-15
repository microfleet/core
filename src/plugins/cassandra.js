const { NotPermittedError } = require('common-errors');
const is = require('is');
const { PluginsTypes } = require('../');
const _require = require('../utils/require');

function factory(Cassandra, config) {
  const models = config.service.models;

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

function attachCassandra(config) {
  const service = this;
  const Cassandra = _require('express-cassandra');

  if (is.fn(service.validateSync)) {
    const isConfigValid = service.validateSync('cassandra', config);

    if (isConfigValid.error) {
      throw isConfigValid.error;
    }
  }

  function connectCassandra() {
    if (service._cassandra) { // eslint-disable-line no-underscore-dangle
      throw new NotPermittedError('Cassandra was already started');
    }

    return factory(Cassandra, config)
      .tap((cassandra) => {
        service._cassandra = cassandra; // eslint-disable-line no-underscore-dangle
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
        service._cassandra = null; // eslint-disable-line no-underscore-dangle
        service.emit('plugin:close:cassandra');
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
  type: PluginsTypes.database,
};
