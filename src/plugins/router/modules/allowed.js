const Errors = require('common-errors');
const Promise = require('bluebird');

function allowedHandler(request, action, router) {
  if (action.allowed === null) {
    return Promise.resolve();
  }

  const promisesFactories = [];
  const extension = router.extension;

  if (extension.has('preAllowed')) {
    promisesFactories.push(function preAllowed() {
      return extension.exec('preAllowed', request, action, router);
    });
  }

  promisesFactories.push(function allowed() {
    return action
      .allowed(request, action, router)
      .catch(error => {
        return Promise.reject(new Errors.NotPermittedError(error));
      });
  });

  if (extension.has('postAllowed')) {
    promisesFactories.push(function postAllowed() {
      return extension.exec('postAllowed', request, action, router);
    });
  }

  return Promise.mapSeries(promisesFactories, handler => handler());
}

function getAllowedHandler(config) {
  return allowedHandler;
}

module.exports = getAllowedHandler;
