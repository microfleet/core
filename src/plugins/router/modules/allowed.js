const Promise = require('bluebird');

function validateHandler(request, action, router) {
  if (action.validate === null) {
    return Promise.resolve();
  }

  const promisesFactories = [];
  const extension = router.extension;
  const validator = router.service.validator;

  if (extension.has('preValidate')) {
    promisesFactories.push(function preValidate() {
      return extension.exec('preValidate', request, action, router);
    });
  }

  promisesFactories.push(function validate() {
    return validator
      .validate(request.route, request.params)
      .tap(sanitizedParams => {
        request.params = sanitizedParams;
      });
  });

  if (extension.has('postValidate')) {
    promisesFactories.push(function postValidate() {
      return extension.exec('postValidate', request, action, router);
    });
  }

  return Promise.mapSeries(promisesFactories, handler => handler());
}

function getValidateHandler(config) {
  return validateHandler;
}

module.exports = getValidateHandler;
