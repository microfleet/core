/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-logger'
/* eslint-enable @typescript-eslint/no-unused-vars */

import { strict as assert } from 'assert'
import { resolve } from 'path'
import * as Bluebird from 'bluebird'
import { NotFoundError, NotPermittedError, ConnectionError } from 'common-errors'

import { PluginInterface } from '@microfleet/core-types'
import { Microfleet, PluginTypes } from '@microfleet/core'
// @todo should be part of plugin-router-amqp
import { RequestCountTracker, ActionTransport } from '@microfleet/plugin-router'
import AMQPTransport = require('@microfleet/transport-amqp')

import type { AMQPPluginConfig } from './types/plugin'

const ERROR_NOT_STARTED = new NotPermittedError('amqp was not started')
const ERROR_ALREADY_STARTED = new NotPermittedError('amqp was already started')
const ERROR_NOT_HEALTHY = new ConnectionError('amqp is not healthy')

declare module '@microfleet/core-types' {
  export interface Microfleet {
    amqp: InstanceType<typeof AMQPTransport> | null;
  }

  export interface ConfigurationOptional {
    amqp: AMQPPluginConfig;
  }
}

export const name = 'amqp'
export const type = PluginTypes.transport
export const priority = 0

/**
 * Attaches plugin to the Mthis class.
 * @param {Object} config - AMQP plugin configuration.
 */
export function attach(
  this: Microfleet,
  options: Partial<AMQPPluginConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError<AMQPPluginConfig>('amqp', options) as AMQPPluginConfig

  /**
   * Check if the service has an amqp transport.
   * @returns A truthy value if the this has an instance of AMQPTransport.
   */
  const isStarted = () => (
    this.amqp && this.amqp instanceof AMQPTransport
  )

  // @todo should be part of plugin-router-amqp
  const waitForRequestsToFinish = () => {
    return RequestCountTracker.waitForRequestsToFinish(this, ActionTransport.amqp)
  }

  /**
   * Check the state of a connection to the amqp server.
   * @param amqp - Instance of AMQPTransport.
   * @returns A truthy value if a provided connection is open.
   */
  const isConnected = (amqp: InstanceType<typeof AMQPTransport>) => (
    amqp._amqp && amqp._amqp.state === 'open'
  )

  // init logger if this is enabled
  const logger = this.log.child({ namespace: '@microfleet/transport-amqp' })

  return {
    /**
     * Generic AMQP Connector.
     * @returns Opens connection to AMQP.
     */
    async connect(this: Microfleet) {
      if (this.amqp) {
        return Bluebird.reject(ERROR_ALREADY_STARTED)
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
      // @ts-expect-error helper in augmentation module, not exposed in ts
      const amqp = this.amqp = await AMQPTransport.connect(connectionOptions)

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
      // @todo assert from isStarted
      assert(this.amqp && this.amqp instanceof AMQPTransport)
      assert(isStarted(), ERROR_NOT_STARTED)
      assert(isConnected(this.amqp), ERROR_NOT_HEALTHY)
      return true
    },

    // @todo should be part of plugin-router-amqp
    getRequestCount(this: Microfleet) {
      return RequestCountTracker.getRequestCount(this, ActionTransport.amqp)
    },

    /**
     * Generic AMQP disconnector.
     * @returns Closes connection to AMQP.
     */
    async close(this: Microfleet) {
      // @todo assert from isStarted
      assert(this.amqp)
      assert(isStarted(), ERROR_NOT_STARTED)

      await this.amqp.closeAllConsumers()
      // @todo should be part of plugin-router-amqp
      // e.g. closeRouterConsumers() && waitForRequestsToFinish()
      await waitForRequestsToFinish()
      await this.amqp.close()

      this.amqp = null
      this.emit('plugin:close:amqp')
    },
  }
}
