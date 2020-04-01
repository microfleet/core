import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginTypes, LoggerPlugin, PluginInterface, ValidatorPlugin } from '@microfleet/core'
import retry = require('bluebird-retry')
import CouchDB = require('nano')

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
export interface CouchDBPlugin<T = any> {
  couchdb: CouchDB.DocumentScope<T>;
}

/**
 * Defines closure
 */
const startupHandlers = (
  service: Microfleet & LoggerPlugin,
  nano: CouchDB.ServerScope,
  database: string,
  indices: Config['indexDefinitions'] = []
): PluginInterface => ({
  async connect() {
    assert(!service[name], 'couchdb has already been initialized')

    const db = nano.use(database)
    const establishConnection = async () => {
      try {
        await nano.db.create(database)
      } catch (e) {
        if (e.statusCode !== 412 || e.error !== 'file_exists') {
          throw e
        }
      }

      for (const indexReq of indices) {
        const resp = await db.createIndex(indexReq)
        service.log.info({ index: resp }, 'created index')
      }

      service[name] = db
    }

    await retry(establishConnection, {
      interval: 500,
      backoff: 2,
      // eslint-disable-next-line @typescript-eslint/camelcase
      max_interval: 5000,
      timeout: 60000,
      // eslint-disable-next-line @typescript-eslint/camelcase
      max_tries: 100,
      predicate(err: Error) {
        service.log.warn({ err }, 'failing to connect to couchdb, scheduling reconnect')
        return true
      },
    })

    service.emit(`plugin:connect:${name}`, service[name])
    return service[name]
  },

  async close() {
    service[name] = null
    service.emit(`plugin:close:${name}`, service[name])
  },
})

export function attach(
  this: Microfleet & LoggerPlugin & ValidatorPlugin,
  params: Config
) {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const opts: Config = this.validator.ifError(name, params)
  const nano = CouchDB(opts.connection)

  return startupHandlers(this, nano, opts.database, opts.indexDefinitions)
}
