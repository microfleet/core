import assert = require('assert')
import retry = require('bluebird-retry')
import Bluebird = require('bluebird')
import Errors = require('common-errors')
import Elasticsearch = require('elasticsearch')
import { NotFoundError } from 'common-errors'
import { Microfleet, PluginInterface, ValidatorPlugin, LoggerPlugin } from '../'
import { PluginTypes } from '../constants'

interface ElasticLogger {
  trace(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warning(...args: any[]): void;
  error(...args: any[]): void;
  fatal(...args: any[]): void;
  close(...args: any[]): void;
}

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 0
export const name = 'elasticsearch'
export const type = PluginTypes.database
export function attach(this: Microfleet & LoggerPlugin & ValidatorPlugin, params: any = {}): PluginInterface {
  assert(this.hasPlugin('logger'), new NotFoundError('logger module must be included'))
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  const conf = this.validator.ifError('elasticsearch', params)
  const { log, ...opts } = conf
  const { log: serviceLogger } = this

  let Logger: any = null
  if (log && log.type === 'service') {
    Logger = {
      debug: serviceLogger.debug.bind(serviceLogger),
      error: serviceLogger.error.bind(serviceLogger),
      info: serviceLogger.info.bind(serviceLogger),
      warning: serviceLogger.warn.bind(serviceLogger),
      trace(method, requestUrl, body, responseBody, responseStatus) {
        serviceLogger.trace({
          body,
          method,
          requestUrl,
          responseBody,
          responseStatus,
        })
      },
      close() { return },
    } as ElasticLogger
  }

  return {

    /**
     * @returns Elasticsearch connection.
     */
    async connect(this: Microfleet) {
      assert(!this.elasticsearch, new Errors.NotPermittedError('elasticsearch was already started'))

      const instance = new Elasticsearch.Client({
        ...opts,
        defer() { return Bluebird.defer() },
        log: Logger || log,
      })

      await retry(instance.nodes.info, {
        context: instance.nodes,
        args: [{ nodeId: '', human: true }],
        interval: 500,
        backoff: 2,
        // eslint-disable-next-line @typescript-eslint/camelcase
        max_interval: 5000,
        timeout: 60000,
        // eslint-disable-next-line @typescript-eslint/camelcase
        max_tries: 100,
      })

      this.elasticsearch = instance
      this.emit('plugin:connect:elasticsearch', instance)
      return instance
    },

    /**
     * @returns Closes elasticsearch connection.
     */
    async close(this: Microfleet) {
      await Bluebird.try(() => this.elasticsearch.close())
      this.elasticsearch = null
      this.emit('plugin:close:elasticsearch')
    },
  }
}
