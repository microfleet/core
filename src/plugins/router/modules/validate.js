// @flow
const { ArgumentError, Error } = require('common-errors');
const { HttpStatusError } = require('@microfleet/validation');
const is = require('is');
const Promise = require('bluebird');
const moduleLifecycle = require('./lifecycle');
const { DATA_KEY_SELECTOR } = require('../../../constants');

function validationSuccess(sanitizedParams) {
  this.request[this.paramsKey] = sanitizedParams;
  return this.request;
}

const handleValidationError = (error) => {
  if (error.constructor === HttpStatusError) {
    throw error;
  }

  throw new Error('internal validation error', error);
};

function validate(request: ServiceRequest): Promise<*> {
  const { validator } = this;
  const paramsKey = DATA_KEY_SELECTOR[request.method];

  return validator
    .validate(request.action.schema, request[paramsKey])
    .bind({ request, paramsKey })
    .then(validationSuccess, handleValidationError);
}

function validateHandler(request: ServiceRequest): Promise<*> {
  if (request.action === undefined) {
    return Promise.reject(new ArgumentError('"request" must have property "action"'));
  }

  if (is.undefined(request.action.schema) === true) {
    return Promise.resolve(request);
  }

  return moduleLifecycle('validate', validate, this.router.extensions, [request], this);
}

module.exports = validateHandler;
