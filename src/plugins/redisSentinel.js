// @flow
const is = require('is');
const assert = require('assert');
const debug = require('debug')('mservice:redisSentinel');

const { PluginsTypes } = require('../');
const _require = require('../utils/require');

const migrate = require('./redis/migrate.js');
const { loadLuaScripts, isStarted, hasConnection } = require('./redis/utils');
const {
  ERROR_NOT_STARTED,
  ERROR_ALREADY_STARTED,
} = require('./redis/constants');

/**
 * Plugin name.
 * @type {string}
 */
exports.name = 'redis';

/**
 * Plugin type.
 * @type {string}
 */
exports.type = PluginsTypes.database;

/**
 * Attaches Redis Sentinel plugin.
 * @param  {Object} [conf={}] - Configuration for Redis Sentinel Connection.
 * @returns {Object} Connections and Destructors.
 */
exports.attach = function attachRedisSentinel(conf: Object = {}) {
  const service = this;
  const Redis = _require('ioredis');
  Redis.Promise = require('bluebird');
  const isRedisStarted = isStarted(service, Redis);

  // optional validation with the plugin
  if (is.fn(service.validateSync)) {
    assert.ifError(service.validateSync('redisSentinel', conf).error);
  }

  debug('loading with config', conf);

  return {

    /**
     * @private
     * @returns {Promise<Redis>} Opens connection to Redis.
     */
    async connect() {
      assert(service._redis == null, ERROR_ALREADY_STARTED);

      const instance = new Redis({
        ...conf,
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

      await instance.connect();

      service.addMigrator('redis', migrate, instance, service);
      service._redis = instance;
      service.emit('plugin:connect:redisSentinel', instance);

      return instance;
    },

    /**
     * @private
     * @returns {Promise} Returns current status of redis sentinel.
     */
    status: hasConnection.bind(service, isRedisStarted),

    /**
     * @private
     * @returns {Promise<void>} Closes redis connection.
     */
    async close() {
      assert(isRedisStarted(), ERROR_NOT_STARTED);

      await service._redis
        .quit()
        .catchReturn({ message: 'Connection is closed.' }, null);

      service._redis = null;
      service.emit('plugin:close:redisSentinel');
    },

  };
};
