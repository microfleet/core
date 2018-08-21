// @flow
const Promise = require('bluebird');
const is = require('is');
const assert = require('assert');
const debug = require('debug')('mservice:redisCluster');

const { PluginsTypes } = require('../');
const _require = require('../utils/require');

const migrate = require('./redis/migrate.js');
const { loadLuaScripts, isStarted } = require('./redis/utils');
const {
  ERROR_NOT_STARTED,
  ERROR_ALREADY_STARTED,
  ERROR_FAILED_HEALTH_CHECK,
} = require('./redis/constants');

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
  const isClusterStarted = isStarted(service, Cluster);

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
        return Promise.reject(ERROR_ALREADY_STARTED);
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
     * @returns {Promise<PluginHealthStatus>} Returns current status of redis cluster.
     */
    async status() {
      assert(isClusterStarted(), ERROR_NOT_STARTED);

      const res = await service._redis.cluster('info');
      const isOk = typeof res === 'string' && res.indexOf('cluster_state:ok') >= 0;
      assert(isOk, ERROR_FAILED_HEALTH_CHECK);

      return true;
    },

    /**
     * @private
     * @returns {Promise<void>} Closes redis connection.
     */
    close: function disconnectRedis() {
      assert(isClusterStarted(), ERROR_NOT_STARTED);

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
