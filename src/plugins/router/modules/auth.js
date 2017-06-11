// @flow
import type { ServiceRequest, ServiceAction } from '../../../types';

const { AuthenticationRequired, NotImplementedError, ArgumentError } = require('common-errors');
const is = require('is');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

let strategies = [];

const remapError = (error) => {
  if (error.constructor === AuthenticationRequired) {
    return Promise.reject(error);
  }

  return Promise.reject(new AuthenticationRequired(error.message, error));
};

function auth(request: ServiceRequest): Promise<any> {
  const action: ServiceAction = request.action;
  const authName = action.auth;
  const authStrategy = strategies[is.fn(authName) ? authName(request) : authName];

  if (authStrategy === undefined) {
    throw new NotImplementedError(action.auth);
  }

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

function authHandler(request: ServiceRequest): Promise<any> {
  if (request.action === undefined) {
    return Promise.reject(new ArgumentError('"request" must have property "action"'));
  }

  if (is.undefined(request.action.auth) === true) {
    return Promise.resolve(request);
  }

  return moduleLifecycle('auth', auth, this.router.extensions, [request], this);
}

function getAuthHandler(config: Object): Function {
  strategies = config.strategies;
  return authHandler;
}

module.exports = getAuthHandler;
