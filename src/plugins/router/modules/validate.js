const Errors = require('common-errors');
const is = require('is');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function validate(request) {
  const validator = this.validator;

  return validator.validate(request.action.schema, request.params)
    .tap(sanitizedParams => {
      request.params = sanitizedParams;
    })
    .return(request)
    .catch(error => {
      if (error.constructor === Errors.ValidationError) {
        return Promise.reject(error);
      }

      return Promise.reject(new Errors.Error(error));
    });
}

function validateHandler(request) {
  if (request.action === undefined) {
    return Promise.reject(new Errors.ArgumentError('"request" must have property "action"'));
  }

  if (is.undefined(request.action.schema) === true) {
    return Promise.resolve(request);
  }

  return moduleLifecycle('validate', validate, this.router.extensions, [request], this);
}

function getValidateHandler() {
  return validateHandler;
}

module.exports = getValidateHandler;
