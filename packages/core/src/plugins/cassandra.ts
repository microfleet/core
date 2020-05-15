import Bluebird = require('bluebird')
import assert = require('assert')
import retry = require('bluebird-retry')
import { NotPermittedError, NotFoundError } from 'common-errors'
import is = require('is')
import { Microfleet } from '../'
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

async function factory(this: Microfleet, Cassandra: any, config: any) {
  const { models } = config.service
  const reconnectOpts = {
    interval: 500,
    backoff: 2,
    // eslint-disable-next-line @typescript-eslint/camelcase
    max_interval: 5000,
    timeout: 60000,
    // eslint-disable-next-line @typescript-eslint/camelcase
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

export function attach(this: Microfleet, params: any = {}) {
  const Cassandra = _require('express-cassandra')

  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  const config = this.validator.ifError('cassandra', params)

  async function connectCassandra(this: Microfleet) {
    assert(!this.cassandra, new NotPermittedError('Cassandra was already started'))
    const cassandra = await factory.call(this, Cassandra, config)

    this.cassandra = cassandra
    this.emit('plugin:connect:cassandra', cassandra)

    return cassandra
  }

  async function disconnectCassandra(this: Microfleet) {
    const { cassandra } = this

    assert(cassandra, new NotPermittedError('Cassandra was not started'))

    await cassandra.closeAsync()

    this.cassandra = null
    this.emit('plugin:close:cassandra')
  }

  return {
    close: disconnectCassandra,
    connect: connectCassandra,
  }
}
