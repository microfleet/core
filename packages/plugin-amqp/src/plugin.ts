import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-logger'
import { strict as assert } from 'assert'
import { resolve } from 'path'
import { NotFoundError, NotPermittedError, ConnectionError } from 'common-errors'

import { PluginInterface } from '@microfleet/core-types'
import { Microfleet, PluginTypes } from '@microfleet/core'
import { AMQPTransport, connect } from '@microfleet/transport-amqp'

import type { AMQPPluginConfig } from './types/plugin'

const ERROR_NOT_STARTED = new NotPermittedError('amqp was not started')
const ERROR_ALREADY_STARTED = new NotPermittedError('amqp was already started')
const ERROR_NOT_HEALTHY = new ConnectionError('amqp is not healthy')

declare module '@microfleet/core-types' {
  export interface Microfleet {
    amqp: AMQPTransport
  }

  export interface ConfigurationOptional {
    amqp: AMQPPluginConfig
  }
}

export const name = 'amqp'
export const type = PluginTypes.transport
export const priority = 20

/**
 * Attaches plugin to the Mthis class.
 * @param config - AMQP plugin configuration.
 */
export async function attach(
  this: Microfleet,
  options: Partial<AMQPPluginConfig> = {}
): Promise<PluginInterface> {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  await this.validator.addLocation(resolve(__dirname, '../schemas'))
  const config = this.config.amqp = this.validator.ifError<AMQPPluginConfig>('amqp', options)

  /**
   * Check if the service has an amqp transport.
   * @returns A truthy value if the this has an instance of AMQPTransport.
   */
  const isStarted = () => (
    this.amqp && this.amqp instanceof AMQPTransport
  )

  /**
   * Check the state of a connection to the amqp server.
   * @param amqp - Instance of AMQPTransport.
   * @returns A truthy value if a provided connection is open.
   */
  const isConnected = (amqp: AMQPTransport) => (
    amqp.state === 'open'
  )

  // init logger if this is enabled
  const logger = this.log.child({ namespace: '@microfleet/transport-amqp', ...config.transport.logOptions })

  return {
    /**
     * Generic AMQP Connector.
     * @returns Opens connection to AMQP.
     */
    async connect(this: Microfleet) {
      if (this.amqp) {
        throw ERROR_ALREADY_STARTED
      }

      // if this.router is present - we will consume messages
      // if not - we will only create a client
      const connectionOptions = {
        ...config.transport,
        log: logger || null,
        tracer: this.tracer,
      }

      // @todo plugin-router-amqp
      // const amqp = this.amqp = await AMQPTransport.connect(connectionOptions, this.AMQPRouter)
      const amqp = this.amqp = await connect(connectionOptions)

      this.emit('plugin:connect:amqp', amqp)

      return amqp
    },

    /**
     * Health checker.
     *
     * Returns true if connection state is 'open', otherwise throws an error.
     * Connection state depends on actual connection status, but it could be
     * modified when a heartbeat message from a message broker is missed during
     * a twice heartbeat interval.
     * @returns A truthy value if all checks are passed.
     */
    async status(this: Microfleet) {
      assert(isStarted(), ERROR_NOT_STARTED)
      assert(isConnected(this.amqp), ERROR_NOT_HEALTHY)
      return true
    },

    /**
     * Generic AMQP disconnector.
     * @returns Closes connection to AMQP.
     */
    async close(this: Microfleet) {
      assert(isStarted(), ERROR_NOT_STARTED)
      await this.amqp.close()
      this.emit('plugin:close:amqp', this.amqp)
    },
  }
}
