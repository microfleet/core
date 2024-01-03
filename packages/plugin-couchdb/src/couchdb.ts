import { strict as assert } from 'node:assert'
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import type { Microfleet } from '@microfleet/core'
import type { PluginInterface } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'
import retry from 'bluebird-retry'
import CouchDB from 'nano'
import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-logger'

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0
export const name = 'couchdb'
export const type = PluginTypes.database

export interface Config {
  connection: CouchDB.Configuration;
  database: string;
  indexDefinitions?: CouchDB.CreateIndexRequest[];
}

declare module '@microfleet/core-types' {
  interface Microfleet {
    couchdb: CouchDB.DocumentScope<any> | null;
  }

  interface ConfigurationOptional {
    couchbd: Config
  }
}

/**
 * Defines closure
 */
const startupHandlers = (
  service: Microfleet,
  nano: CouchDB.ServerScope,
  database: string,
  indices: Config['indexDefinitions'] = []
): PluginInterface => ({
  async connect() {
    assert(!service.couchdb, 'couchdb has already been initialized')

    const db = nano.use(database)
    const establishConnection = async () => {
      try {
        await nano.db.create(database)
      } catch (e: any) {
        if (e.statusCode !== 412 || e.error !== 'file_exists') {
          throw e
        }
      }

      for (const indexReq of indices) {
        const resp = await db.createIndex(indexReq)
        service.log.info({ index: resp }, 'created index')
      }

      service.couchdb = db
    }

    await retry(establishConnection, {
      interval: 500,
      backoff: 2,
      max_interval: 5000,
      timeout: 60000,
      max_tries: 100,
      predicate(err: Error) {
        service.log.warn({ err }, 'failing to connect to couchdb, scheduling reconnect')
        return true
      },
    })

    service.emit(`plugin:connect:${name}`, service.couchdb)
    return service.couchdb
  },

  async close() {
    const { couchdb } = service
    service.emit(`plugin:close:${name}`, couchdb)
    service.couchdb = null
  },
})

export async function attach(
  this: Microfleet,
  params: Config
): Promise<PluginInterface> {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  await this.validator.addLocation(resolve(__dirname, '../schemas'))

  const opts = this.validator.ifError<Config>(name, params)
  const nano = CouchDB(opts.connection)

  return startupHandlers(this, nano, opts.database, opts.indexDefinitions)
}
