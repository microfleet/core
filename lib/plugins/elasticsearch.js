'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

const Errors = require('common-errors');
const Promise = require('bluebird');
const Elasticsearch = require('elasticsearch');
const is = require('is');

exports.name = 'elasticsearch';

exports.attach = function attachElasticsearch(conf = {}) {
  const service = this;

  // optional validation with the plugin
  if (is.fn(service.validateSync)) {
    const isConfValid = service.validateSync('elasticsearch', conf);
    if (isConfValid.error) {
      throw isConfValid.error;
    }
  }

  const log = conf.log;

  const opts = _objectWithoutProperties(conf, ['log']);

  let Logger = null;
  if (log && log.type === 'service') {
    if (!service._log) {
      throw new Errors.ReferenceError('\'logger\' plugin is required to use \'service\' logging');
    }

    Logger = function ElasticLogger() {
      const _log = service._log;

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
          responseStatus
        });
      };
      this.close = function close() {/* not need to close */};
    };
  }

  return {
    /**
     * @private
     * @return {Promise}
     */
    connect: function connectElasticsearch() {
      if (service._elasticsearch) {
        return Promise.reject(new Errors.NotPermittedError('elasticsearch was already started'));
      }
      const instance = new Elasticsearch.Client(_extends({}, opts, {
        defer: () => {
          const defer = {};

          defer.promise = new Promise((resolve, reject) => {
            defer.resolve = resolve;
            defer.reject = reject;
          });

          return defer;
        },
        log: Logger || log
      }));

      return instance.nodes.info({ human: true }).then(() => {
        service._elasticsearch = instance;
        service.emit('plugin:connect:elasticsearch', instance);
        return instance;
      });
    },

    /**
     * @private
     * @return {Promise}
     */
    close: function disconnectElasticsearch() {
      return Promise.try(() => service._elasticsearch.close()).then(() => {
        service._elasticsearch = null;
        service.emit('plugin:close:elasticsearch');
        return true;
      });
    }
  };
};