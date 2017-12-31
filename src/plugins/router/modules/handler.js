// @flow
const Errors = require('common-errors');
const is = require('is');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function handler(request: ServiceRequest): Promise<any> {
  if (request.action === undefined) {
    return Promise.reject(new Errors.ArgumentError('"request" must have property "action"'));
  }

  if (is.fn(request.action) !== true) {
    return Promise.reject(new Errors.NotImplementedError('Action must be a function'));
  }

  const { extensions } = this.router;
  return moduleLifecycle('handler', request.action, extensions, [request], this);
}

module.exports = handler;
