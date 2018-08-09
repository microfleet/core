// @flow

/**
 * Project deps
 * @private
 */
const Errors = require('common-errors');
const Promise = require('bluebird');
const is = require('is');
const { PluginsTypes } = require('../');
const _require = require('../utils/require');

exports.name = 'elasticsearch';
exports.type = PluginsTypes.database;

exports.attach = function attachElasticsearch(conf: Object = {}): PluginInterface {
  const service = this;
  const Elasticsearch = _require('elasticsearch');

  // optional validation with the plugin
  if (is.fn(service.validateSync)) {
    const isConfValid = service.validateSync('elasticsearch', conf);
    if (isConfValid.error) {
      throw isConfValid.error;
    }
  }

  const { log, ...opts } = conf;

  let Logger = null;
  if (log && log.type === 'service') {
    if (!service._log) {
      throw new Errors.ReferenceError('\'logger\' plugin is required to use \'service\' logging');
    }

    Logger = function ElasticLogger() {
      const { _log } = service;
      this.error = _log.error.bind(_log);
      this.warning = _log.warn.bind(_log);
      this.info = _log.info.bind(_log);
      this.debug = _log.debug.bind(_log);
      this.trace = function trace(method, requestUrl, body, responseBody, responseStatus) {
        _log.trace({
          method,
          requestUrl,
          body,
          responseBody,
          responseStatus,
        });
      };
      this.close = function close() { /* not need to close */ };
    };
  }

  return {

    /**
     * @private
     * @returns {Promise<Elasticsearch>} Elasticsearch connection.
     */
    connect: function connectElasticsearch() {
      if (service._elasticsearch) {
        return Promise.reject(new Errors.NotPermittedError('elasticsearch was already started'));
      }

      const instance = new Elasticsearch.Client({
        ...opts,
        defer: () => {
          const defer = {};

          defer.promise = new Promise((resolve, reject) => {
            defer.resolve = resolve;
            defer.reject = reject;
          });

          return defer;
        },
        log: Logger || log,
      });

      return instance.nodes.info({ human: true }).then(() => {
        service._elasticsearch = instance;
        service.emit('plugin:connect:elasticsearch', instance);
        return instance;
      });
    },

    /**
     * @private
     * @returns {Promise<void>} Closes elasticsearch connection.
     */
    close: function disconnectElasticsearch() {
      return Promise.try(() => service._elasticsearch.close())
        .then(() => {
          service._elasticsearch = null;
          service.emit('plugin:close:elasticsearch');
          return true;
        });
    },
  };
};
