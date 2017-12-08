// @flow
import type { ServiceRequest } from '../../../types';

const { NotPermittedError, ArgumentError } = require('common-errors');
const is = require('is');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function allowed(request: ServiceRequest): Promise<ServiceRequest | NotPermittedError | ArgumentError> {
  // $FlowFixMe
  return Promise
    .bind(this, request)
    .then(request.action.allowed)
    .return(request)
    .catch((error) => {
      if (error.constructor === NotPermittedError) {
        return Promise.reject(error);
      }

      return Promise.reject(new NotPermittedError(error));
    });
}

function allowedHandler(request: ServiceRequest): Promise<*> {
  if (request.action === undefined) {
    return Promise.reject(new ArgumentError('"request" must have property "action"'));
  }

  if (is.undefined(request.action.allowed) === true) {
    return Promise.resolve(request);
  }

  return moduleLifecycle('allowed', allowed, this.router.extensions, [request], this);
}

module.exports = allowedHandler;
