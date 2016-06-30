const Errors = require('common-errors');
const Promise = require('bluebird');
const is = require('is');

const map = require('lodash/map');
const join = require('lodash/join');

exports.name = 'crate';

exports.attach = function attachCrate(conf = {}) {
  const service = this;

  // optional validation with the plugin
  if (is.fn(service.validateSync)) {
    const isConfValid = service.validateSync('crate', conf);
    if (isConfValid.error) {
      throw isConfValid.error;
    }
  }

  return {
    /**
     * @private
     * @return {Promise}
     */
    connect: function connectCrate() {
      if (service._crate) {
        return Promise.reject(new Errors.NotPermittedError('crate was already started'));
      }

      const connectionString = join(map(conf.servers, server => {
        const protocol = server.secure ? 'https://' : 'http://';
        return `${protocol}${server.host}:${server.port}`;
      }), ' ');

      const instance = require('node-crate');
      instance.connect(connectionString);

      return Promise.resolve(instance);
    },

    /**
     * @private
     * @return {Promise}
     */
    close: function disconnectCrate() {
      return Promise.resolve(true);
    },
  };
};
