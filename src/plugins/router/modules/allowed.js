const Errors = require('common-errors');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function allowed(request, action, router) {
  return action.allowed(request, action, router)
    .catch(error => {
      if (error.constructor === Errors.NotPermittedError) {
        return Promise.reject(error);
      }

      return Promise.reject(new Errors.NotPermittedError(error));
    });
}

function allowedHandler(request, action, router) {
  if (action.allowed === null) {
    return Promise.resolve();
  }

  return moduleLifecycle('allowed', allowed, router.extensions, [request, action, router]);
}

function getAllowedHandler() {
  return allowedHandler;
}

module.exports = getAllowedHandler;
