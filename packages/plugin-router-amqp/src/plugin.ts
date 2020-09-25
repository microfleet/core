import { strict as assert } from 'assert'
import { NotFoundError } from 'common-errors'
import { resolve } from 'path'
import {
  Microfleet,
  PluginTypes,
  ValidatorPlugin,
  RouterPlugin,
  PluginInterface,
} from '@microfleet/core'

// @todo import { AMQPPlugin } from '@microfleet/plugin-amqp' ?
import type { AMQPPlugin } from '@microfleet/plugin-amqp/lib/types/plugin'

import getReptyOnCompleteFunction from './retry'
import getAMQPRouterAdapter from './adapter'
import { RouterAMQPPluginConfig } from './types/plugin'

const identity = <T>(arg: T) => arg

export const name = 'router-amqp'
export const type = PluginTypes.transport
export const priority = 1 // should be after plugin-amqp

export function attach(
  this: Microfleet & ValidatorPlugin & RouterPlugin & AMQPPlugin,
  options: Partial<RouterAMQPPluginConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const routerAmqpConfig = this.validator.ifError(name, options) as RouterAMQPPluginConfig
  // @todo (!) amqpConfig doesnt contains config defaults
  const amqpConfig = this.config.amqp
  const logger = this.log.child({ namespace: '@microfleet/router-amqp' })

  let retryQueue: string
  let onComplete

  if (routerAmqpConfig.retry.enabled) {
    assert.ok(routerAmqpConfig.retry.queue || amqpConfig.transport.queue, '`retry.queue` or `transport.queue` must be truthy string')

    retryQueue = routerAmqpConfig.retry.queue || `x-delay-${amqpConfig.transport.queue}`
    onComplete = getReptyOnCompleteFunction(amqpConfig, routerAmqpConfig, logger, retryQueue)
  }

  const adapter = getAMQPRouterAdapter(this.router, routerAmqpConfig, onComplete)

  return {
    async connect(this: Microfleet & AMQPPlugin) {
      // create extra queue for retry logic based on RabbitMQ DLX & headers exchanges
      if (routerAmqpConfig.retry.enabled) {
        // in case defaults were overwritten - throw here
        assert.ok(this.amqp.config.headersExchange.exchange, 'transport.headersExchange.exchange must be set')

        await this.amqp.createQueue({
          arguments: {
            'x-dead-letter-exchange': this.amqp.config.headersExchange.exchange,
            'x-max-priority': 100, // to support proper priorities
          },
          autoDelete: false,
          durable: true,
          queue: retryQueue,
          router: null,
        })
      }

      await this.amqp.createConsumedQueue(
        adapter,
        Object
          .keys(this.router.routes.amqp)
          .map(routerAmqpConfig.prefix ? route => `${routerAmqpConfig.prefix}.${route}` : identity)
      )
    },

    async close(this: Microfleet) {
      return Promise.resolve()
    },

    // @todo should be here?
    // getRequestCount(this: Microfleet) {
    //   return RequestTracker.getRequestCount(this, ActionTransport.amqp)
    // },
  }
}
