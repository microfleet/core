import type * as _ from '@microfleet/plugin-amqp'
import { strict as assert } from 'assert'
import { NotFoundError } from 'common-errors'
import { resolve } from 'path'
import type { PluginInterface } from '@microfleet/core-types'
import { Microfleet, PluginTypes } from '@microfleet/core'
import { RequestCountTracker, ActionTransport } from '@microfleet/plugin-router'
import { Message } from '@microfleet/amqp-coffee'
import getReptyOnCompleteFunction from './retry'
import getAMQPRouterAdapter from './adapter'
import { RouterAMQPPluginConfig } from './types/plugin'

declare module '@microfleet/core-types' {
  interface ConfigurationOptional {
    routerAmqp: RouterAMQPPluginConfig
  }
}

export const name = 'routerAmqp'
export const type = PluginTypes.transport
export const priority = 101 // should be after plugin-amqp and plugin router

export function attach(
  this: Microfleet,
  options: Partial<RouterAMQPPluginConfig> = {}
): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('log module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  assert(this.hasPlugin('router'), new NotFoundError('router module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const routerAmqpConfig = this.validator.ifError<RouterAMQPPluginConfig>('router-amqp', options)
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

  const adapter = getAMQPRouterAdapter(this, routerAmqpConfig, onComplete)
  const { router: { requestCountTracker } } = this
  const decreaseCounter = (): void => requestCountTracker.decrease(ActionTransport.amqp)
  const increaseCounter = (): void => requestCountTracker.increase(ActionTransport.amqp)

  let processedCounter = 0
  let lastMessage: Message | null = null
  const { multiAckEvery, multiAckAfter } = routerAmqpConfig
  const enableMultiAck = multiAckEvery > 0
    && !routerAmqpConfig.retry.enabled
    && amqpConfig.transport.neck > 0

  const commitLatestMessage = () => {
    if (lastMessage) {
      lastMessage.multiAck()
      lastMessage = null
    }
  }

  let timer: NodeJS.Timer | null = null
  const afterRequest = enableMultiAck ?
    (raw: Message) => {
      processedCounter += 1
      if (processedCounter % multiAckEvery === 0) {
        processedCounter = 0
        raw.multiAck()
        lastMessage = null
      } else {
        lastMessage = raw
      }

      if (timer) timer.refresh()
      decreaseCounter()
    }
    : decreaseCounter

  return {
    async connect(this: Microfleet) {
      assert.ok(this.amqp)

      if (enableMultiAck) {
        timer = setInterval(commitLatestMessage, multiAckAfter)
      }

      this.amqp.on('pre', increaseCounter)
      this.amqp.on('after', afterRequest)

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

      for (const route of this.router.routes.get(ActionTransport.amqp).keys()) {
        routes.push(routerAmqpConfig.prefix ? `${routerAmqpConfig.prefix}.${route}` : route)
      }

      await this.amqp.createConsumedQueue(adapter, routes)
    },

    async close(this: Microfleet) {
      await this.amqp.closeAllConsumers()

      if (timer) clearInterval(timer)
      await RequestCountTracker.waitForRequestsToFinish(this, ActionTransport.amqp)
      if (enableMultiAck) commitLatestMessage()

      this.amqp.removeListener('pre', increaseCounter)
      this.amqp.removeListener('after', afterRequest)
    },

    getRequestCount(this: Microfleet) {
      return RequestCountTracker.getRequestCount(this, ActionTransport.amqp)
    },
  }
}
