import assert = require('assert');
import Bluebird = require('bluebird');
import Errors = require('common-errors');
import is = require('is');
import { Microfleet, PluginTypes } from '../';
import _require from '../utils/require';

interface IElasticLogger {
  trace(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warning(...args: any[]): void;
  error(...args: any[]): void;
  fatal(...args: any[]): void;
  close(...args: any[]): void;
}

export const name = 'elasticsearch';
export const type = PluginTypes.database;
export function attach(this: Microfleet, conf: any = {}) {
  const service = this;
  const Elasticsearch = _require('elasticsearch');

  // optional validation with the plugin
  if (is.fn(service.ifError)) {
    service.ifError('elasticsearch', conf);
  }

  if (!service.log) {
    throw new Errors.ReferenceError('\'logger\' plugin is required to use \'service\' logging');
  }

  const { log, ...opts } = conf;
  const { log: serviceLogger } = service;

  let Logger: any = null;
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
        });
      },
      close() { return; },
    } as IElasticLogger;
  }

  return {

    /**
     * @returns Elasticsearch connection.
     */
    async connect() {
      assert(!service.elasticsearch, new Errors.NotPermittedError('elasticsearch was already started'));

      const instance = new Elasticsearch.Client({
        ...opts,
        defer() {
          const defer = Object.create(null);
          defer.promise = new Bluebird((resolve, reject) => {
            defer.resolve = resolve;
            defer.reject = reject;
          });
          return defer;
        },
        log: Logger || log,
      });

      await instance.nodes.info({ human: true });

      service.elasticsearch = instance;
      service.emit('plugin:connect:elasticsearch', instance);
      return instance;
    },

    /**
     * @returns Closes elasticsearch connection.
     */
    async close() {
      await Bluebird.try(() => service.elasticsearch.close());
      service.elasticsearch = null;
      service.emit('plugin:close:elasticsearch');
    },
  };
}
