// @flow
const Errors = require('common-errors');
const { PluginsTypes } = require('../');
const Promise = require('bluebird');
const is = require('is');
const assert = require('assert');
const loadLuaScripts = require('./redis/utils.js');
const migrate = require('./redis/migrate.js');
const debug = require('debug')('mservice:redisCluster');
const _require = require('../utils/require');

/**
 * Plugin name.
 * @type {string}
 */
exports.name = 'redis';

/**
 * Plugin type
 * @type {string}
 */
exports.type = PluginsTypes.database;

exports.attach = function attachRedisCluster(conf: Object = {}) {
  const service = this;
  const { Cluster } = _require('ioredis');

  // optional validation with the plugin
  if (is.fn(service.validateSync)) {
    assert.ifError(service.validateSync('redisCluster', conf).error);
  }

  debug('loading with config', conf);

  return {

    /**
     * @private
     * @returns {Promise} Opens redis connection.
     */
    connect: function connectRedis() {
      if (service._redis) {
        return Promise.reject(new Errors.NotPermittedError('redis was already started'));
      }

      const instance = new Cluster(conf.hosts, {
        ...conf.options,
        lazyConnect: true,
      });

      if (service._tracer) {
        const applyInstrumentation = _require('opentracing-js-ioredis');
        applyInstrumentation(service._tracer, instance);
      }

      // attach to instance right away
      if (conf.luaScripts) {
        debug('attaching lua');
        loadLuaScripts(conf.luaScripts, instance);
      }

      return instance
        .connect()
        .then(() => {
          service.addMigrator('redis', migrate, instance, service);
          service._redis = instance;
          service.emit('plugin:connect:redisCluster', instance);
          return instance;
        });
    },

    /**
     * @private
     * @returns {Promise<void>} Closes redis connection.
     */
    close: function disconnectRedis() {
      if (!service._redis || !(service._redis instanceof Cluster)) {
        return Promise.reject(new Errors.NotPermittedError('redis was not started'));
      }

      return service
        ._redis
        .quit()
        .catchReturn({ message: 'Connection is closed.' }, null)
        .tap(() => {
          service._redis = null;
          service.emit('plugin:close:redisCluster');
        });
    },

  };
};
