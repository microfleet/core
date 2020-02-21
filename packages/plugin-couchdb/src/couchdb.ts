import assert = require('assert')
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginTypes, PluginInterface } from '@microfleet/core'
import { LoggerPlugin } from '@microfleet/types/types/plugin-logger'
import retry = require('bluebird-retry')
import CouchDB = require('nano')

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0
export const name = 'couchdb'
export const type = PluginTypes.database
export interface Config {
  connection: CouchDB.Configuration
  database: string
  indexDefinitions?: CouchDB.CreateIndexRequest[]
}
export interface CouchDBPlugin<T = any> {
  couchdb: CouchDB.DocumentScope<T>
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
      max_interval: 5000,
      timeout: 60000,
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
  this: Microfleet & LoggerPlugin,
  params: Config
) {
  const service = this

  assert(service.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(service.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  service.validator.addLocation(resolve(__dirname, '../schemas'))

  const opts: Config = service.ifError(name, params)
  const nano = CouchDB(opts.connection)

  return startupHandlers(service, nano, opts.database, opts.indexDefinitions)
}
