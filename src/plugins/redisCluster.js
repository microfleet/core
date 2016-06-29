const Errors = require('common-errors');
const Promise = require('bluebird');
const { Cluster } = require('ioredis');
const is = require('is');
const loadLuaScripts = require('./redis/utils.js');

exports.name = 'redis';

exports.attach = function attachRedisCluster(conf = {}) {
  const service = this;

  // optional validation with the plugin
  if (is.fn(service.validateSync)) {
    const isConfValid = service.validateSync('redisCluster', conf);
    if (isConfValid.error) throw isConfValid.error;
  }

  return {
    /**
     * @private
     * @return {Promise}
     */

    connect: function connectRedis() {
      if (service._redis) {
        return Promise.reject(new Errors.NotPermittedError('redis was already started'));
      }

      /* eslint-disable prefer-const */
      return new Promise((resolve, reject) => {
        let onReady;
        let onError;

        const instance = new Cluster(conf.hosts, conf.options);

        // attach to instance right away
        if (conf.luaScripts) {
          loadLuaScripts(conf.luaScripts, instance);
        }

        onReady = function redisConnect() { // eslint-disable-line prefer-const
          instance.removeListener('error', onError);
          resolve(instance);
        };

        onError = function redisError(err) { // eslint-disable-line prefer-const
          instance.removeListener('ready', onReady);
          reject(err);
        };

        instance.once('ready', onReady);
        instance.once('error', onError);
      })
      .tap(instance => {
        service._redis = instance;
        service.emit('plugin:connect:redisCluster', instance);
      });
      /* eslint-enable prefer-const */
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
        .tap(() => {
          service._redis = null;
          service.emit('plugin:close:redisCluster');
        });
    },

  };
};
