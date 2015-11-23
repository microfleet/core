const Errors = require('common-errors');
const Promise = require('bluebird');
const { Cluster } = require('ioredis');

exports.name = 'redis';

exports.attach = function attachRedisCluster(conf = {}) {
  const service = this;

  // optional validation with the plugin
  if (typeof service.validateSync === 'function') {
    const isConfValid = service.validateSync('redisCluster', conf);
    if (isConfValid.error) {
      throw isConfValid.error;
    }
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

      return new Promise(function redisClusterConnected(resolve, reject) {
        let onReady;
        let onError;

        const instance = new Cluster(conf.hosts, conf.options);

        onReady = function redisConnect() {
          instance.removeListener('error', onError);
          resolve(instance);
        };

        onError = function redisError(err) {
          instance.removeListener('ready', onReady);
          reject(err);
        };

        instance.once('ready', onReady);
        instance.once('error', onError);
      })
      .tap(function attachRedisInstance(instance) {
        service._redis = instance;
        service.emit('plugin:connect:redisCluster', instance);
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

      return service._redis
        .quit()
        .tap(function cleanupRedisRef() {
          service._redis = null;
          service.emit('plugin:close:redisCluster');
        });
    },

  };
};
