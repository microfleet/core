// @flow
import type { ServiceRequest, ServiceAction } from '../../../types';

const { AuthenticationRequired, NotImplementedError, ArgumentError } = require('common-errors');
const is = require('is');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

const remapError = (error) => {
  if (error.constructor === AuthenticationRequired) {
    return Promise.reject(error);
  }

  return Promise.reject(new AuthenticationRequired(error.message, error));
};

function auth(request: ServiceRequest, strategies: Object): Promise<any> {
  // eslint-disable-next-line prefer-destructuring
  const action: ServiceAction = request.action;
  const authName = action.auth;
  const authStrategy = strategies[is.fn(authName) ? authName(request) : authName];

  if (authStrategy == null) {
    throw new NotImplementedError(action.auth);
  }

  // $FlowFixMe
  const promise = Promise
    .bind(this, request)
    .then(authStrategy)
    .tap((credentials) => {
      request.auth = { credentials };
    })
    .return(request);

  if (action.passAuthError === true) {
    return promise;
  }

  return promise.catch(remapError);
}

function assignStrategies(strategies): Function {
  return function authHandler(request: ServiceRequest): Promise<any> {
    if (request.action === undefined) {
      return Promise.reject(new ArgumentError('"request" must have property "action"'));
    }

    if (is.undefined(request.action.auth) === true) {
      return Promise.resolve(request);
    }

    return moduleLifecycle('auth', auth, this.router.extensions, [request, strategies], this);
  };
}

function getAuthHandler(config: Object): Function {
  const strategies = Object.assign(Object.create(null), config.strategies);
  return assignStrategies(strategies);
}

module.exports = getAuthHandler;
