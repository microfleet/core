const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function validate(request, action, router) {
  const validator = router.service.validator;

  return validator.validate(request.route, request.params)
    .then(sanitizedParams => {
      request.params = sanitizedParams;
    });
}

function validateHandler(request, action, router) {
  if (action.validate === null) {
    return Promise.resolve();
  }

  return moduleLifecycle('validate', validate, router.extensions, [request, action, router]);
}

function getValidateHandler(config) {
  return validateHandler;
}

module.exports = getValidateHandler;
