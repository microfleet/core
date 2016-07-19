const Errors = require('common-errors');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

let strategies = [];

function auth(request, action, router) {
  const authStrategy = strategies[action.auth];

  if (authStrategy === undefined) {
    throw new Errors.NotImplementedError(action.auth);
  }

  return authStrategy(request, action, router)
    .then(credentials => {
      request.auth = { credentials };
    })
    .catch(error => {
      if (error.constructor === Errors.AuthenticationRequired) {
        return Promise.reject(error);
      }

      return Promise.reject(new Errors.AuthenticationRequired(error));
    });
}

function authHandler(request, action, router) {
  if (action.auth === null) {
    return Promise.resolve();
  }

  return moduleLifecycle('auth', auth, router.extensions, [request, action, router]);
}

function getAuthHandler(config) {
  strategies = config.strategies;
  return authHandler;
}

module.exports = getAuthHandler;
