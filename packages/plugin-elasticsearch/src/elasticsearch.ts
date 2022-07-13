import type * as _ from '@microfleet/plugin-logger'
import { strict as assert } from 'node:assert'
import retry from 'bluebird-retry'
import { ClientOptions as Config, Client } from '@elastic/elasticsearch'
import { NotFoundError } from 'common-errors'
import type { Microfleet, PluginInterface } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'
import { resolve } from 'path'

declare module '@microfleet/core-types' {
  interface Microfleet {
    elasticsearch: Client
  }
  interface Configuration {
    elasticsearch: Config
  }
}

export { Config }

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0

export const name = 'elasticsearch'

export const type = PluginTypes.database

export function attach(this: Microfleet, params: Partial<Config> = {}): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('logger module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const conf = this.validator.ifError<Config>('elasticsearch', params)
  this.elasticsearch = new Client({ ...conf })

  return {

    /**
     * @returns Elasticsearch connection.
     */
    async connect(this: Microfleet) {
      await retry(this.elasticsearch.nodes.info, {
        context: this.elasticsearch.nodes,
        args: [{ nodeId: '', human: true }],
        interval: 500,
        backoff: 2,
        max_interval: 5000,
        timeout: 60000,
        max_tries: 100,
      })

      this.emit('plugin:connect:elasticsearch', this.elasticsearch)
      return this.elasticsearch
    },

    /**
     * @returns Closes elasticsearch connection.
     */
    async close(this: Microfleet) {
      await this.elasticsearch.close()
      this.emit('plugin:close:elasticsearch')
    },
  }
}
