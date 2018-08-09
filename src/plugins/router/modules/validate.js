// @flow
const Errors = require('common-errors');
const is = require('is');
const Promise = require('bluebird');
const moduleLifecycle = require('./lifecycle');
const { DATA_KEY_SELECTOR } = require('../../../constants');

const handleValidationError = (error) => {
  if (error.constructor === Errors.ValidationError) {
    throw error;
  }

  throw new Errors.Error('internal validation error', error);
};

function validate(request: ServiceRequest): Promise<*> {
  const { validator } = this;
  const paramsKey = DATA_KEY_SELECTOR[request.method];

  return validator
    .validate(request.action.schema, request[paramsKey])
    .then((sanitizedParams) => {
      request[paramsKey] = sanitizedParams;
      return request;
    })
    .catch(handleValidationError);
}

function validateHandler(request: ServiceRequest): Promise<*> {
  if (request.action === undefined) {
    return Promise.reject(new Errors.ArgumentError('"request" must have property "action"'));
  }

  if (is.undefined(request.action.schema) === true) {
    return Promise.resolve(request);
  }

  return moduleLifecycle('validate', validate, this.router.extensions, [request], this);
}

module.exports = validateHandler;
