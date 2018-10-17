import assert = require('assert')
import Bluebird = require('bluebird')
import Errors = require('common-errors')
import eventToPromise = require('event-to-promise')
import is = require('is')
import { ActionTransport, Microfleet, PluginTypes } from '../'
import _require from '../utils/require'
import getAMQPRouterAdapter from './amqp/router/adapter'
import verifyPossibility from './router/verifyAttachPossibility'

/**
 * Helpers Section
 */
const NULL_UUID = '00000000-0000-0000-0000-000000000000'
const identity = <T>(arg: T) => arg

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
 * Plugin Name
 */
export const name = 'amqp'

/**
 * Plugin Type
 */
export const type = PluginTypes.transport

/**
 * Attaches plugin to the MService class.
 * @param {Object} config - AMQP plugin configuration.
 */
export function attach(this: Microfleet, config: any = {}) {
  const service = this

  const AMQPTransport = _require('@microfleet/transport-amqp') as any
  const Backoff = require('@microfleet/transport-amqp/lib/utils/recovery')

  const ERROR_NOT_STARTED = new Errors.NotPermittedError('amqp was not started')
  const ERROR_NOT_HEALTHY = new Errors.ConnectionError('amqp is not healthy')

  /**
   * Check if the service has an amqp transport.
   * @returns A truthy value if the service has an instance of AMQPTransport.
   */
  const isStarted = () => (
    service.amqp && service.amqp instanceof AMQPTransport
  )

  /**
   * Check the state of a connection to the amqp server.
   * @param amqp - Instance of AMQPTransport.
   * @returns A truthy value if a provided connection is open.
   */
  const isConnected = (amqp: typeof AMQPTransport) => (
    amqp._amqp && amqp._amqp.state === 'open'
  )

  if (is.fn(service.ifError)) {
    service.ifError('amqp', config)
  }

  // init logger if service is enabled
  const logger = service.log && service.log.child({ namespace: '@microfleet/transport-amqp' })

  // initializes custom onComplete function
  if (config.retry && config.retry.enabled === true) {
    assert.equal(
      config.transport.bindPersistantQueueToHeadersExchange, true,
      'config.transport.bindPersistantQueueToHeadersExchange must be set to true'
    )
    assert.ok(config.retry.queue || config.transport.queue, '`retry.queue` or `transport.queue` must be truthy string')
    assert.equal(typeof config.transport.onComplete, 'undefined', 'transport.onComplete must be undefined')
    assert.equal(typeof config.transport.neck, 'number', 'neck must be set to >= 0')
    assert.ok(config.transport.neck >= 0, 'neck must be set for the retry to work')
    assert.equal(typeof config.retry.predicate, 'function', '`retry.predicate` must be defined')

    // adds queue setup connector - will be initialized after AMQP is connected
    service.retryQueue = config.retry.queue || `x-delay-${config.transport.queue}`

    // cache vars for faster access
    const { retry } = config
    const { predicate, maxRetries } = retry
    const backoff = new Backoff({ qos: retry })

    /**
     * Composes onComplete handler for QoS enabled Subscriber.
     * Allows one to set custom fast-rejection policy.
     * Relies on certain configuration options of the initialized service.
     *
     * @param err - Possible error.
     * @param data - Anything that is a response.
     * @param actionName - In-flight action name.
     * @param message - An amqp-coffee raw message.
     */
    config.transport.onComplete = async (err: any, data: any, actionName: string, message: any) => {
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
        if (logger) {
          logger.info('Sent, ack: [%s]', actionName)
        }

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
      const retryMessageOptions: any = {
        confirm: true,
        expiration: expiration.toString(),
        headers: {
          'routing-key': actionName,
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

      if (service.amqp == null) {
        try {
          const toWrap = eventToPromise.multi(service as any, ['plugin:connect:amqp'], [
            'plugin:close:amqp',
            'error',
          ])
          await Bluebird.resolve(toWrap).timeout(10000)
        } catch (e) {
          message.retry()
          return Bluebird.reject(e)
        }
      }

      try {
        await service.amqp.send(service.retryQueue, message.raw, retryMessageOptions)
      } catch (e) {
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

  if (config.router && config.router.enabled === true) {
    verifyPossibility(service.router, ActionTransport.amqp)
    service.AMQPRouter = getAMQPRouterAdapter(service.router, config)
    const { prefix } = config.router
    // allow ms-amqp-transport to discover routes
    config.transport.listen = Object.keys(service.router.routes.amqp)
      .map(prefix ? route => `${prefix}.${route}` : identity)
  }

  return {

    /**
     * Generic AMQP Connector.
     * @returns Opens connection to AMQP.
     */
    async connect() {
      if (service.amqp) {
        return Bluebird.reject(new Errors.NotPermittedError('amqp was already started'))
      }

      // if service.router is present - we will consume messages
      // if not - we will only create a client
      const opts = {
        ...config.transport,
        log: logger || null,
        tracer: service.tracer,
      }
      const amqp = service.amqp = await AMQPTransport.connect(opts, service.AMQPRouter)

      // create extra queue for retry logic based on RabbitMQ DLX & headers exchanges
      if (config.retry && config.retry.enabled === true) {
        // in case defaults were overwritten - throw here
        assert.ok(amqp.config.headersExchange.exchange, 'transport.headersExchange.exchange must be set')

        await amqp.createQueue({
          arguments: {
            'x-dead-letter-exchange': amqp.config.headersExchange.exchange,
            'x-max-priority': 100, // to support proper priorities
          },
          autoDelete: false,
          durable: true,
          queue: service.retryQueue,
          router: null,
        })
      }

      service.emit('plugin:connect:amqp', amqp)

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
    async status() {
      assert(isStarted(), ERROR_NOT_STARTED)
      assert(isConnected(service.amqp), ERROR_NOT_HEALTHY)
      return true
    },

    /**
     * Generic AMQP disconnector.
     * @returns Closes connection to AMQP.
     */
    async close() {
      assert(isStarted(), ERROR_NOT_STARTED)

      await service.amqp.close()

      service.amqp = null
      service.emit('plugin:close:amqp')
    },

  }
}
