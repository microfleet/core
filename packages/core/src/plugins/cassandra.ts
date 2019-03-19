import Bluebird = require('bluebird')
import assert = require('assert')
import retry = require('bluebird-retry')
import { NotPermittedError, NotFoundError } from 'common-errors'
import is = require('is')
import { Microfleet, LoggerPlugin } from '../'
import { PluginTypes } from '../constants'
import _require from '../utils/require'

/**
 * Plugin Name
 */
export const name = 'cassandra'

/**
 * Plugin Type
 */
export const type = PluginTypes.database

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0

async function factory(this: Microfleet & LoggerPlugin, Cassandra: any, config: any) {
  const { models } = config.service
  const reconnectOpts = {
    interval: 500,
    backoff: 2,
    max_interval: 5000,
    timeout: 60000,
    max_tries: 100,
  }

  const reportError = (connect: () => Promise<void>) => async () => {
    try {
      await connect()
    } catch (e) {
      this.log.warn({ err: e }, 'Failed to connect to cassandra')
      throw e
    }
  }

  if (is.string(models)) {
    Cassandra.setDirectory(models)

    await retry(
      reportError(async () => Cassandra.bindAsync(config.client)),
      reconnectOpts
    )

    return Cassandra
  }

  const client = Cassandra.createClient(config.client)

  await retry(
    reportError(async () => client.initAsync()),
    reconnectOpts
  )

  await Bluebird.mapSeries(Object.entries(models), ([modelName, model]) => {
    const Model = client.loadSchema(modelName, model)
    return Bluebird.fromCallback(next => Model.syncDB(next))
  })

  return client
}

export function attach(this: Microfleet & LoggerPlugin, params: any = {}) {
  const service = this
  const Cassandra = _require('express-cassandra')

  assert(service.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(service.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  const config = service.ifError('cassandra', params)

  async function connectCassandra() {
    assert(!service.cassandra, new NotPermittedError('Cassandra was already started'))
    const cassandra = await factory.call(service, Cassandra, config)

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
