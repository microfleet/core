import { strict as assert } from 'assert'
import Bluebird = require('bluebird')
import eventToPromise from 'event-to-promise'
import { Microfleet } from '@microfleet/core-types'
import { Logger } from '@microfleet/plugin-logger'
import Backoff = require('@microfleet/transport-amqp/lib/utils/recovery')

import { RouterAMQPPluginConfig } from './types/plugin'

const NULL_UUID = '00000000-0000-0000-0000-000000000000'

/**
 * Calculate priority based on message expiration time.
 * Logic behind it is to give each expiration a certain priority bucket
 * based on the amount of priority levels in the RabbitMQ queue.
 * @param expiration - Current expiration (retry) time.
 * @param maxExpiration - Max possible expiration (retry) time.
 * @returns Queue Priority Level.
 */
function calculatePriority(expiration: number, maxExpiration: number) {
  const newExpiration = Math.min(expiration, maxExpiration)
  return 100 - Math.floor((newExpiration / maxExpiration) * 100)
}

/**
 * Composes onComplete handler for QoS enabled Subscriber.
 * Allows one to set custom fast-rejection policy.
 * Relies on certain configuration options of the initialized this.
 *
 * @param err - Possible error.
 * @param data - Anything that is a response.
 * @param actionName - In-flight action name.
 * @param message - An amqp-coffee raw message.
 */
export default (
  amqpConfig: Microfleet['config']['amqp'],
  routerAmqpConfig: RouterAMQPPluginConfig,
  logger: Logger,
  retryQueue: string
): (this: Microfleet, err: Error | null | undefined, data: any, actionName: string, message: any) => Promise<any> => {
  const { transport } = amqpConfig
  const { prefix, retry } = routerAmqpConfig

  // @todo renew text for errors
  assert.ok(
    transport.bindPersistantQueueToHeadersExchange,
    'config.transport.bindPersistantQueueToHeadersExchange must be set to true'
  )
  assert.equal(typeof transport.neck, 'number', 'neck must be set to >= 0')
  assert.ok(transport.neck >= 0, 'neck must be set for the retry to work')
  assert.equal(typeof retry.predicate, 'function', '`retry.predicate` must be defined')

  const { predicate, maxRetries } = retry
  const backoff = new Backoff({ qos: retry })

  return async function onCompleteRetry(
    this: Microfleet, err: any, data: any, actionName: string, message: any
  ): Promise<any> {
    const { properties } = message
    const { headers } = properties

    // reassign back so that response can be routed properly
    if (headers['x-original-correlation-id'] !== undefined) {
      properties.correlationId = headers['x-original-correlation-id']
    }

    if (headers['x-original-reply-to'] !== undefined) {
      properties.replyTo = headers['x-original-reply-to']
    }

    if (!err) {
      logger.info('Sent, ack: [%s]', actionName)
      message.ack()

      return data
    }

    // check for current try
    err.retryAttempt = (headers['x-retry-count'] || 0)
    const retryCount = err.retryAttempt + 1

    // quite complex, basicaly verifies that these are not logic errors
    // and that if there were no other problems - that we haven't exceeded max retries
    if (predicate(err, actionName) || retryCount > maxRetries) {
      // we must ack, otherwise message would be returned to sender with reject
      // instead of promise.reject
      message.ack()
      if (logger !== undefined) {
        const logLevel = err.retryAttempt === 0 ? 'warn' : 'error'
        logger[logLevel]({ err, properties }, 'Failed: [%s]', actionName)
      }
      return Bluebird.reject(err)
    }

    // assume that predefined accounts must not fail - credentials are correct
    if (logger) {
      logger.warn({ err, properties }, 'Retry: [%s]', actionName)
    }

    // retry message options
    const expiration = backoff.get('qos', retryCount)
    const routingKey = prefix ? `${prefix}.${actionName}` : actionName
    const retryMessageOptions: any = {
      confirm: true,
      expiration: expiration.toString(),
      headers: {
        'routing-key': routingKey,
        'x-original-error': String(err),
        'x-retry-count': retryCount,
      },
      mandatory: true,
      priority: calculatePriority(expiration, retry.max),
      skipSerialize: true,
    }

    // deal with special routing properties
    const { replyTo, correlationId } = properties

    // correlation id is used in routing stuff back from DLX, so we have to "hide" it
    // same with replyTo
    if (replyTo !== undefined) {
      retryMessageOptions.headers['x-original-reply-to'] = replyTo
    }

    if (correlationId !== undefined) {
      retryMessageOptions.headers['x-original-correlation-id'] = correlationId
    }

    if (this.amqp == null) {
      try {
        const toWrap = eventToPromise.multi(this as any, ['plugin:connect:amqp'], [
          'plugin:close:amqp',
          'error',
        ])
        await Bluebird.resolve(toWrap).timeout(10000)
        assert(this.amqp)
      } catch (e: any) {
        message.retry()
        return Bluebird.reject(e)
      }
    }

    try {
      await this.amqp.send(retryQueue, message.raw, retryMessageOptions)
    } catch (e: any) {
      if (logger) {
        logger.error({ err: e }, 'Failed to queue retried message')
      }
      message.retry()
      return Bluebird.reject(err)
    }

    if (logger) {
      logger.debug('queued retry message')
    }
    message.ack()

    // enrich error
    err.scheduledRetry = true

    // reset correlation id
    // that way response will actually come, but won't be routed in the private router
    // of the sender
    properties.correlationId = NULL_UUID

    // reject with an error, yet a retry will still occur
    return Bluebird.reject(err)
  }
}
