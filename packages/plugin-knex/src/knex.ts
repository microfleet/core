import assert = require('assert')
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginTypes, LoggerPlugin } from '@microfleet/core'
import retry = require('bluebird-retry')
import Knex = require('knex')

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0
export const name = 'knex'
export const type = PluginTypes.database
export interface KnexPlugin {
  knex: Knex
}

export function attach(
  this: Microfleet & LoggerPlugin,
  params: Knex.Config | string = {}
) {
  const service = this

  assert(service.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(service.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  service.validator.addLocation('../schemas')

  const opts = service.ifError('knex', params)
  const config: Knex.Config = service.ifError(`knex.${opts.client}`, opts)

  const knex = service.knex = Knex(config)

  const establishConnection = async () => {
    try {
      const result = await knex.raw('SELECT TRUE;')
      assert.equal(result.rows[0].bool, true)
    } catch (err) {
      this.log.warn({ err }, 'Failed to connect to PGSQL')
      throw err
    }
  }

  return {
    async connect() {
      await retry(establishConnection, {
        interval: 500,
        backoff: 2,
        max_interval: 5000,
        timeout: 60000,
        max_tries: 100,
      })

      service.addMigrator('knex', () => knex.migrate.latest())
      service.emit('plugin:connect:knex', knex)

      return knex
    },

    async close() {
      await knex.destroy()
      service.emit('plugin:close:knex')
    },
  }
}
