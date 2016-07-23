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
        return Promise.reject(new Errors.NotPermittedError('redis was already started'));
      }

      Mongoose.Promise = Promise;

      return new Promise(() => {
        const connOpts = conf.standalone ? conf.standalone : (conf.replicaSet ? conf.replicaSet : conf.mongos); // eslint-disable-line
        return Mongoose.createConnection(connOpts.connectionString, connOpts.options);
      })
      .tap(instance => {
        service._mongo = instance;
        service.emit('plugin:connect:mongo', instance);
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

      return Promise.bind(service)
        .tap(() => { this._mongo.disconnect(); })
        .tap(() => {
          this._mongo = null;
          this.emit('plugin:close:mongo');
        });
    },
  };
};
