const Errors = require('common-errors');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function handler(request, action, router) {
  if (action.handler === null) {
    return Promise.reject(new Errors.NotImplementedError('Handler must be set'));
  }

  return moduleLifecycle('handler', action.handler, router.extensions, [request, action, router]);
}

function getHandler() {
  return handler;
}

module.exports = getHandler;
