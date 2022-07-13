import { strict as assert } from 'node:assert'
import { resolve } from 'path'
import { NotFoundError } from 'common-errors'
import type { PluginInterface } from '@microfleet/core-types'
import type { Microfleet } from '@microfleet/core'
import { PluginTypes } from '@microfleet/utils'
import retry from 'bluebird-retry'
import { knex, Knex } from 'knex'

import '@microfleet/plugin-logger'
import '@microfleet/plugin-validator'

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0
export const name = 'knex'
export const type = PluginTypes.database
declare module '@microfleet/core-types' {
  interface Microfleet {
    knex: Knex;
  }

  interface ConfigurationOptional {
    knex: Knex.Config
  }
}

/**
 * Defines closure
 */
const startupHandlers = (service: Microfleet, knex: Knex): PluginInterface => ({
  async connect() {
    const establishConnection = async () => {
      try {
        const result = await knex.raw('SELECT TRUE;')
        assert.strictEqual(result.rows[0].bool, true)
      } catch (err) {
        service.log.warn({ err }, 'Failed to connect to PGSQL')
        throw err
      }
    }

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
})

export function attach(
  this: Microfleet,
  params: Knex.Config | string = {}
): PluginInterface {
  const { validator } = this
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const opts = validator.ifError<Knex.Config>('knex', params)
  const config = validator.ifError<Knex.Config>(`knex.${opts.client}`, opts)

  this.knex = knex(config)

  return startupHandlers(this, this.knex)
}
