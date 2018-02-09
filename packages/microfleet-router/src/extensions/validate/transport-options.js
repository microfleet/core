// @flow

const Promise = require('bluebird');
const { NotSupportedError } = require('common-errors');

function postRequest(error: Error, request: ServiceRequest) {
  const result = Promise.resolve([error, request]);

  if (error) {
    return result;
  }

  const { method, transport, action: { transportsOptions } } = request;

  if (transportsOptions === undefined) {
    return result;
  }

  const transportOptions = transportsOptions[transport];

  if (transportOptions === undefined) {
    return result;
  }

  if (transportOptions.methods.includes(method) === false) {
    throw new NotSupportedError(`Route ${request.route} method ${method}`);
  }

  return result;
}

module.exports = [{
  point: 'postRequest',
  handler: postRequest,
}];
