// @flow
import type { ServiceRequest } from '../../../types';

const Errors = require('common-errors');
const is = require('is');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

// based on this we validate input data
const DATA_KEY_SELECTOR = {
  get: 'query',
  delete: 'query',
  head: 'query',
  patch: 'params',
  put: 'params',
  post: 'params',
  amqp: 'params',
  socketio: 'params',
};

function validate(request: ServiceRequest): Promise<*> {
  const validator = this.validator;
  const paramsKey = DATA_KEY_SELECTOR[request.method];

  return validator
    .validate(request.action.schema, request[paramsKey])
    .then((sanitizedParams) => {
      request[paramsKey] = sanitizedParams;
      return request;
    })
    .catch((error) => {
      if (error.constructor === Errors.ValidationError) {
        throw error;
      }

      throw new Errors.Error(error);
    });
}

function validateHandler(request: ServiceRequest): Promise<*> {
  if (request.action === undefined) {
    return Promise.reject(new Errors.ArgumentError('"request" must have property "action"'));
  }

  if (is.undefined(request.action.schema) === true) {
    return Promise.resolve(request);
  }

  return moduleLifecycle('validate', validate, this.router.extensions, [request], this);
}

module.exports = validateHandler;
