const Errors = require('common-errors');
const is = require('is');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

let strategies = [];

function auth(request) {
  const authName = request.action.auth;
  const authStrategy = strategies[is.fn(authName) ? authName(request) : authName];

  if (authStrategy === undefined) {
    throw new Errors.NotImplementedError(request.action.auth);
  }

  return Promise.resolve(request)
    .bind(this)
    .then(authStrategy)
    .tap((credentials) => {
      request.auth = { credentials };
    })
    .return(request)
    .catch((error) => {
      if (error.constructor === Errors.AuthenticationRequired) {
        return Promise.reject(error);
      }

      return Promise.reject(new Errors.AuthenticationRequired(error));
    });
}

function authHandler(request) {
  if (request.action === undefined) {
    return Promise.reject(new Errors.ArgumentError('"request" must have property "action"'));
  }

  if (is.undefined(request.action.auth) === true) {
    return Promise.resolve(request);
  }

  return moduleLifecycle('auth', auth, this.router.extensions, [request], this);
}

function getAuthHandler(config) {
  strategies = config.strategies;
  return authHandler;
}

module.exports = getAuthHandler;
