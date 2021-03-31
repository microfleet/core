import Bluebird = require('bluebird')
import assert = require('assert')
import retry = require('bluebird-retry')
import { NotPermittedError, NotFoundError } from 'common-errors'
import type { Microfleet, PluginInterface } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'
import Cassandra = require('express-cassandra')
import { resolve } from 'path'

/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as _ from '@microfleet/plugin-logger'
import type * as __ from '@microfleet/plugin-validator'
/* eslint-enable @typescript-eslint/no-unused-vars */

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

declare module '@microfleet/core-types' {
  interface Microfleet {
    cassandra: Cassandra
  }

  interface ConfigurationOptional {
    cassandra: Config
  }
}

export type Cassandra<T = any> = T

export interface Config {
  service: {
    models: string | Record<string, any>
  },
  client: {
    clientOptions: {
      contactPoints: string[]
    },
    protocolOptions: {
      port: string | number
    },
    keyspace: string,
    queryOptions: {
      consistency: number
    }
  }
}

async function factory(this: Microfleet, Cassandra: Cassandra, config: Config) {
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

  if (typeof models === 'string') {
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

export function attach(this: Microfleet, params: Partial<Config> = {}): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  this.validator.addLocation(resolve(__dirname, '../schemas'))
  const config = this.validator.ifError<Config>('cassandra', params)

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
