const Errors = require('common-errors');
const Promise = require('bluebird');
const is = require('is');
const loadLuaScripts = require('./redis/utils.js');
const migrate = require('./redis/migrate.js');
const debug = require('debug')('mservice:redisCluster');
const _require = require('../utils/require');

exports.name = 'redis';

exports.attach = function attachRedisCluster(conf = {}) {
  const service = this;
  const { Cluster } = _require('ioredis');

  // optional validation with the plugin
  if (is.fn(service.validateSync)) {
    const isConfValid = service.validateSync('redisCluster', conf);
    if (isConfValid.error) throw isConfValid.error;
  }

  debug('loading with config', conf);

  return {
    /**
     * @private
     * @return {Promise}
     */

    connect: function connectRedis() {
      if (service._redis) {
        return Promise.reject(new Errors.NotPermittedError('redis was already started'));
      }

      const instance = new Cluster(conf.hosts, {
        ...conf.options,
        lazyConnect: true,
      });

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
     * @return {Promise}
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
