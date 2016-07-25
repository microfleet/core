'use strict';

const Errors = require('common-errors');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function response(error, result, logger) {
  if (error) {
    switch (error.constructor) {
      case Errors.AuthenticationRequiredError:
      case Errors.ValidationError:
      case Errors.NotPermittedError:
      case Errors.NotFoundError:
        return Promise.reject(error);
      default:
        logger.error(error);
        return Promise.reject(new Errors.Error('Something went wrong'));
    }
  }

  return Promise.resolve(result);
}

function getResponseHandler(callback, router) {
  return function responseHandler(error, result) {
    const params = [error, result, router.service.logger];
    return moduleLifecycle('response', response, router.extensions, params).asCallback(callback);
  };
}

module.exports = getResponseHandler;