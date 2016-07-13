const Errors = require('common-errors');
const Promise = require('bluebird');

let strategies = [];

function authHandler(request, action, router) {
  if (action.auth === null) {
    return Promise.resolve();
  }

  const authStrategy = strategies[action.auth];
  const promisesFactories = [];
  const extension = router.extension;

  if (authStrategy === undefined) {
    throw new Errors.NotImplementedError(action.auth);
  }

  if (extension.has('preAuth')) {
    promisesFactories.push(function preAuth() {
      return extension.exec('preAuth', request, action, router);
    });
  }

  promisesFactories.push(function auth() {
    return authStrategy(request, action, router);
  });

  if (extension.has('postAuth')) {
    promisesFactories.push(function postAuth() {
      return extension.exec('postAuth', request, action, router);
    });
  }

  return Promise.map(promisesFactories, handler => handler());
}

function getAuthHandler(config) {
  strategies = config.strategies;
  return authHandler;
}

module.exports = getAuthHandler;
