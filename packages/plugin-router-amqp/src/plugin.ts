import type * as _ from '@microfleet/plugin-amqp'
import { strict as assert } from 'assert'
import { NotFoundError } from 'common-errors'
import { resolve } from 'path'
import type { PluginInterface } from '@microfleet/core-types'
import { Microfleet, PluginTypes } from '@microfleet/core'
import { RequestCountTracker, ActionTransport } from '@microfleet/plugin-router'
import getReptyOnCompleteFunction from './retry'
import getAMQPRouterAdapter from './adapter'
import { RouterAMQPPluginConfig } from './types/plugin'

declare module '@microfleet/core-types' {
  interface ConfigurationOptional {
    routerAmqp: RouterAMQPPluginConfig
  }
}

declare module '@microfleet/plugin-router' {
  interface ServiceAction {
    bindingKey?: string | string[]
    omitPrefix?: boolean
  }
}

const toArray = <T>(x: T | T[]): T[] => Array.isArray(x) ? x : [x]

export const name = 'routerAmqp'
export const type = PluginTypes.transport
export const priority = 30 // should be after plugin-amqp and plugin router

export function attach(
  this: Microfleet,
  options: Partial<RouterAMQPPluginConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  assert(this.hasPlugin('router'), new NotFoundError('router module must be included'))
  assert(this.hasPlugin('amqp'), new NotFoundError('router module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const routerAmqpConfig = this.validator.ifError<RouterAMQPPluginConfig>('router-amqp', options)
  const amqpConfig = this.config.amqp
  const logger = this.log.child({ namespace: '@microfleet/router-amqp' })

  let retryQueue: string
  let onComplete

  if (routerAmqpConfig.retry.enabled) {
    assert.ok(routerAmqpConfig.retry.queue || amqpConfig.transport.queue, '`retry.queue` or `transport.queue` must be truthy string')

    retryQueue = routerAmqpConfig.retry.queue || `x-delay-${amqpConfig.transport.queue}`
    onComplete = getReptyOnCompleteFunction(amqpConfig, routerAmqpConfig, logger, retryQueue)
  }

  if (routerAmqpConfig.multiAckAfter) amqpConfig.transport.multiAckAfter = routerAmqpConfig.multiAckAfter
  if (routerAmqpConfig.multiAckEvery) amqpConfig.transport.multiAckEvery = routerAmqpConfig.multiAckEvery

  const adapter = getAMQPRouterAdapter(this, routerAmqpConfig, onComplete)
  const { router: { requestCountTracker } } = this
  const decreaseCounter = (): void => requestCountTracker.decrease(ActionTransport.amqp)
  const increaseCounter = (): void => requestCountTracker.increase(ActionTransport.amqp)

  return {
    async connect(this: Microfleet) {
      assert.ok(this.amqp)

      this.amqp.on('pre', increaseCounter)
      this.amqp.on('after', decreaseCounter)

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
        })
      }

      const routes = []
      const amqpActions = this.router.routes.get(ActionTransport.amqp)

      for (const [name, action] of amqpActions.entries()) {
        for (const route of toArray(action.bindingKey || name)) {
          routes.push(routerAmqpConfig.prefix && !action.omitPrefix ? `${routerAmqpConfig.prefix}.${route}` : route)
        }
      }

      await this.amqp.createConsumedQueue(adapter, routes, {
        autoDeserialize: routerAmqpConfig.autoDeserialize,
      })
    },

    async close(this: Microfleet) {
      await this.amqp.closeAllConsumers()

      await RequestCountTracker.waitForRequestsToFinish(this, ActionTransport.amqp)

      this.amqp.removeListener('pre', increaseCounter)
      this.amqp.removeListener('after', decreaseCounter)
    },

    getRequestCount(this: Microfleet) {
      return RequestCountTracker.getRequestCount(this, ActionTransport.amqp)
    },
  }
}
