const Errors = require('common-errors');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function validate(request, action, router) {
  const validator = router.service.validator;

  return validator.validate(request.route, request.params)
    .then(sanitizedParams => {
      request.params = sanitizedParams;
    })
    .catch(error => {
      if (error.constructor === Errors.ValidationError) {
        return Promise.reject(error);
      }

      return Promise.reject(new Errors.Error(error));
    });
}

function validateHandler(request, action, router) {
  if (action.schema === null) {
    return Promise.resolve();
  }

  return moduleLifecycle('validate', validate, router.extensions, [request, action, router]);
}

function getValidateHandler() {
  return validateHandler;
}

module.exports = getValidateHandler;
