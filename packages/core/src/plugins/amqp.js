"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const Bluebird = require("bluebird");
const Errors = require("common-errors");
const eventToPromise = require("event-to-promise");
const common_errors_1 = require("common-errors");
const get = require("get-value");
const __1 = require("../");
const require_1 = require("../utils/require");
const adapter_1 = require("./amqp/router/adapter");
const verifyAttachPossibility_1 = require("./router/verifyAttachPossibility");
const RequestTracker = require("./router/request-tracker");
/**
 * Helpers Section
 */
const NULL_UUID = '00000000-0000-0000-0000-000000000000';
const identity = (arg) => arg;
/**
 * Calculate priority based on message expiration time.
 * Logic behind it is to give each expiration a certain priority bucket
 * based on the amount of priority levels in the RabbitMQ queue.
 * @param expiration - Current expiration (retry) time.
 * @param maxExpiration - Max possible expiration (retry) time.
 * @returns Queue Priority Level.
 */
function calculatePriority(expiration, maxExpiration) {
    const newExpiration = Math.min(expiration, maxExpiration);
    return 100 - Math.floor((newExpiration / maxExpiration) * 100);
}
/**
 * Plugin Name
 */
exports.name = 'amqp';
/**
 * Plugin Type
 */
exports.type = __1.PluginTypes.transport;
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 0;
/**
 * Attaches plugin to the Mthis class.
 * @param {Object} config - AMQP plugin configuration.
 */
function attach(opts = {}) {
    assert(this.hasPlugin('logger'), new common_errors_1.NotFoundError('log module must be included'));
    assert(this.hasPlugin('validator'), new common_errors_1.NotFoundError('validator module must be included'));
    const config = this.validator.ifError('amqp', opts);
    const AMQPTransport = require_1.default('@microfleet/transport-amqp');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Backoff = require('@microfleet/transport-amqp/lib/utils/recovery');
    const ERROR_NOT_STARTED = new Errors.NotPermittedError('amqp was not started');
    const ERROR_NOT_HEALTHY = new Errors.ConnectionError('amqp is not healthy');
    /**
     * Check if the service has an amqp transport.
     * @returns A truthy value if the this has an instance of AMQPTransport.
     */
    const isStarted = () => (this.amqp && this.amqp instanceof AMQPTransport);
    const waitForRequestsToFinish = () => {
        return RequestTracker.waitForRequestsToFinish(this, __1.ActionTransport.amqp);
    };
    /**
     * Check the state of a connection to the amqp server.
     * @param amqp - Instance of AMQPTransport.
     * @returns A truthy value if a provided connection is open.
     */
    const isConnected = (amqp) => (amqp._amqp && amqp._amqp.state === 'open');
    // init logger if this is enabled
    const logger = this.log.child({ namespace: '@microfleet/transport-amqp' });
    // initializes custom onComplete function
    if (config.retry && config.retry.enabled === true) {
        assert.equal(config.transport.bindPersistantQueueToHeadersExchange, true, 'config.transport.bindPersistantQueueToHeadersExchange must be set to true');
        assert.ok(config.retry.queue || config.transport.queue, '`retry.queue` or `transport.queue` must be truthy string');
        assert.equal(typeof config.transport.onComplete, 'undefined', 'transport.onComplete must be undefined');
        assert.equal(typeof config.transport.neck, 'number', 'neck must be set to >= 0');
        assert.ok(config.transport.neck >= 0, 'neck must be set for the retry to work');
        assert.equal(typeof config.retry.predicate, 'function', '`retry.predicate` must be defined');
        // adds queue setup connector - will be initialized after AMQP is connected
        this.retryQueue = config.retry.queue || `x-delay-${config.transport.queue}`;
        // cache vars for faster access
        const { retry } = config;
        const { predicate, maxRetries } = retry;
        const backoff = new Backoff({ qos: retry });
        const prefix = get(config, 'router.prefix', '');
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
        config.transport.onComplete = async (err, data, actionName, message) => {
            const { properties } = message;
            const { headers } = properties;
            // reassign back so that response can be routed properly
            if (headers['x-original-correlation-id'] !== undefined) {
                properties.correlationId = headers['x-original-correlation-id'];
            }
            if (headers['x-original-reply-to'] !== undefined) {
                properties.replyTo = headers['x-original-reply-to'];
            }
            if (!err) {
                if (logger) {
                    logger.info('Sent, ack: [%s]', actionName);
                }
                message.ack();
                return data;
            }
            // check for current try
            err.retryAttempt = (headers['x-retry-count'] || 0);
            const retryCount = err.retryAttempt + 1;
            // quite complex, basicaly verifies that these are not logic errors
            // and that if there were no other problems - that we haven't exceeded max retries
            if (predicate(err, actionName) || retryCount > maxRetries) {
                // we must ack, otherwise message would be returned to sender with reject
                // instead of promise.reject
                message.ack();
                if (logger !== undefined) {
                    const logLevel = err.retryAttempt === 0 ? 'warn' : 'error';
                    logger[logLevel]({ err, properties }, 'Failed: [%s]', actionName);
                }
                return Bluebird.reject(err);
            }
            // assume that predefined accounts must not fail - credentials are correct
            if (logger) {
                logger.warn({ err, properties }, 'Retry: [%s]', actionName);
            }
            // retry message options
            const expiration = backoff.get('qos', retryCount);
            const routingKey = prefix ? `${prefix}.${actionName}` : actionName;
            const retryMessageOptions = {
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
            };
            // deal with special routing properties
            const { replyTo, correlationId } = properties;
            // correlation id is used in routing stuff back from DLX, so we have to "hide" it
            // same with replyTo
            if (replyTo !== undefined) {
                retryMessageOptions.headers['x-original-reply-to'] = replyTo;
            }
            if (correlationId !== undefined) {
                retryMessageOptions.headers['x-original-correlation-id'] = correlationId;
            }
            if (this.amqp == null) {
                try {
                    const toWrap = eventToPromise.multi(this, ['plugin:connect:amqp'], [
                        'plugin:close:amqp',
                        'error',
                    ]);
                    await Bluebird.resolve(toWrap).timeout(10000);
                }
                catch (e) {
                    message.retry();
                    return Bluebird.reject(e);
                }
            }
            try {
                await this.amqp.send(this.retryQueue, message.raw, retryMessageOptions);
            }
            catch (e) {
                if (logger) {
                    logger.error({ err: e }, 'Failed to queue retried message');
                }
                message.retry();
                return Bluebird.reject(err);
            }
            if (logger) {
                logger.debug('queued retry message');
            }
            message.ack();
            // enrich error
            err.scheduledRetry = true;
            // reset correlation id
            // that way response will actually come, but won't be routed in the private router
            // of the sender
            properties.correlationId = NULL_UUID;
            // reject with an error, yet a retry will still occur
            return Bluebird.reject(err);
        };
    }
    if (config.router && config.router.enabled === true) {
        verifyAttachPossibility_1.verifyAttachPossibility(this.router, __1.ActionTransport.amqp);
        this.AMQPRouter = adapter_1.default(this.router, config);
        const { prefix } = config.router;
        // allow ms-amqp-transport to discover routes
        config.transport.listen = Object.keys(this.router.routes.amqp)
            .map(prefix ? route => `${prefix}.${route}` : identity);
    }
    return {
        /**
         * Generic AMQP Connector.
         * @returns Opens connection to AMQP.
         */
        async connect() {
            if (this.amqp) {
                return Bluebird.reject(new Errors.NotPermittedError('amqp was already started'));
            }
            // if this.router is present - we will consume messages
            // if not - we will only create a client
            const connectionOptions = {
                ...config.transport,
                log: logger || null,
                tracer: this.tracer,
            };
            const amqp = this.amqp = await AMQPTransport.connect(connectionOptions, this.AMQPRouter);
            // create extra queue for retry logic based on RabbitMQ DLX & headers exchanges
            if (config.retry && config.retry.enabled === true) {
                // in case defaults were overwritten - throw here
                assert.ok(amqp.config.headersExchange.exchange, 'transport.headersExchange.exchange must be set');
                await amqp.createQueue({
                    arguments: {
                        'x-dead-letter-exchange': amqp.config.headersExchange.exchange,
                        'x-max-priority': 100,
                    },
                    autoDelete: false,
                    durable: true,
                    queue: this.retryQueue,
                    router: null,
                });
            }
            this.emit('plugin:connect:amqp', amqp);
            return amqp;
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
            assert(isStarted(), ERROR_NOT_STARTED);
            assert(isConnected(this.amqp), ERROR_NOT_HEALTHY);
            return true;
        },
        getRequestCount() {
            return RequestTracker.getRequestCount(this, __1.ActionTransport.amqp);
        },
        /**
         * Generic AMQP disconnector.
         * @returns Closes connection to AMQP.
         */
        async close() {
            assert(isStarted(), ERROR_NOT_STARTED);
            await this.amqp.closeAllConsumers();
            await waitForRequestsToFinish();
            await this.amqp.close();
            this.amqp = null;
            this.emit('plugin:close:amqp');
        },
    };
}
exports.attach = attach;
//# sourceMappingURL=amqp.js.map