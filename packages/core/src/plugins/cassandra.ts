import assert = require('assert')
import { NotPermittedError } from 'common-errors'
import is = require('is')
import { Microfleet, PluginTypes } from '../'
import _require from '../utils/require'

/**
 * Plugin Name
 */
export const name = 'cassandra'

/**
 * Plugin Type
 */
export const type = PluginTypes.database

function factory(Cassandra: any, config: any) {
  const { models } = config.service

  if (is.string(models)) {
    return Cassandra
      .setDirectory(models)
      .bindAsync(config.client)
      .return(Cassandra)
  }

  const client = Cassandra.createClient(config.client)

  return client
    .connectAsync()
    .return(Object.keys(models))
    .map((modelName: string) => client.loadSchemaAsync(modelName, models[modelName]))
    .return(client)
}

export function attach(this: Microfleet, config: any = {}) {
  const service = this
  const Cassandra = _require('express-cassandra')

  if (is.fn(service.ifError)) {
    service.ifError('cassandra', config)
  }

  async function connectCassandra() {
    assert(!service.cassandra, new NotPermittedError('Cassandra was already started'))
    const cassandra = await factory(Cassandra, config)

    service.cassandra = cassandra
    service.emit('plugin:connect:cassandra', cassandra)

    return cassandra
  }

  async function disconnectCassandra() {
    const { cassandra } = service

    assert(cassandra, new NotPermittedError('Cassandra was not started'))

    await cassandra.closeAsync()

    service.cassandra = null
    service.emit('plugin:close:cassandra')
  }

  return {
    close: disconnectCassandra,
    connect: connectCassandra,
  }
}
