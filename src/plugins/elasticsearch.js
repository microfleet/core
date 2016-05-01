const Errors = require('common-errors');
const Promise = require('bluebird');
const Elasticsearch = require('elasticsearch');

exports.name = 'elasticsearch';

exports.attach = function attachElasticsearch(conf = {}) {
  const service = this;

  // optional validation with the plugin
  if (typeof service.validateSync === 'function') {
    const isConfValid = service.validateSync('elasticsearch', conf);
    if (isConfValid.error) {
      throw isConfValid.error;
    }
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

      const instance = new Elasticsearch.Client({ ...conf,
        defer: () => {
          const defer = {};

          defer.promise = new Promise((resolve, reject) => {
            defer.resolve = resolve;
            defer.reject = reject;
          });

          return defer;
        },
      });

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
      return Promise.try(() => service._elasticsearch.close())
        .then(() => {
          service._elasticsearch = null;
          service.emit('plugin:close:elasticsearch');
          return true;
        });
    },
  };
};
