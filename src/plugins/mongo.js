/**
 * Created by Stainwoortsel on 12.07.2016.
 */
const Errors = require('common-errors');
const Promise = require('bluebird');
const Mongoose = require('mongoose');
const is = require('is');
const debug = require('debug');

exports.name = 'mongo';

exports.attach = function attachMongo(conf = {}) {
  const service = this;

  // optional validation with the plugin
  if (is.fn(service.validateSync)) {
    const isConfValid = service.validateSync('mongo', conf);
    if (isConfValid.error) throw isConfValid.error;
  }

  debug('loading with config', conf);

  return {

    /**
     * @private
     * @return {Promise}
     */
    connect: function connectMongo() {
      if (service._mongo) {
        return Promise.reject(new Errors.NotPermittedError('mongo was already started'));
      }

      Mongoose.Promise = Promise;
      const connOpts = conf.standalone ? conf.standalone : (conf.replicaSet ? conf.replicaSet : conf.mongos); // eslint-disable-line
      return Mongoose
        .connect(connOpts.connectionString, { ...connOpts.options, promiseLibrary: Promise })
        .then(instance => {
          service._mongo = Mongoose;
          service.emit('plugin:connect:mongo', instance);
          return Mongoose;
        });
    },

    /**
     * @private
     * @return {Promise}
     */
    close: function disconnectMongo() {
      if (!service._mongo) {
        return Promise.reject(new Errors.NotPermittedError('mongo was not started'));
      }

      return Promise
        .fromCallback(next => service._mongo.connection.close(next))
        .tap(() => {
          service._mongo = null;
          service.emit('plugin:close:mongo');
        });
    },
  };
};
