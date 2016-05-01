const Errors = require('common-errors');
const Promise = require('bluebird');
const Redis = require('ioredis');

exports.name = 'redis';

exports.attach = function attachRedisSentinel(conf = {}) {
  const service = this;

  // optional validation with the plugin
  if (typeof service.validateSync === 'function') {
    const isConfValid = service.validateSync('redisSentinel', conf);
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

      const instance = new Redis({ ...conf, lazyConnect: true });
      return instance.connect().then(() => {
        service._redis = instance;
        service.emit('plugin:connect:redisSentinel', instance);
        return instance;
      });
    },

    /**
     * @private
     * @return {Promise}
     */
    close: function disconnectRedis() {
      if (!service._redis || !(service._redis instanceof Redis)) {
        return Promise.reject(new Errors.NotPermittedError('redis was not started'));
      }

      return service
        ._redis
        .quit()
        .tap(() => {
          service._redis = null;
          service.emit('plugin:close:redisSentinel');
        });
    },

  };
};
