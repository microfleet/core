const debug = require('debug')('mservice:router:module:request');
const Errors = require('common-errors');
const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function getAction(route, routes, request) {
  debug('handler for module "request"');
  const action = routes[route];

  if (action === undefined) {
    return Promise.reject(new Errors.NotFoundError(route));
  }

  request.route = route;

  return Promise.resolve(action);
}

function requestHandler(route, routes, request, router) {
  return moduleLifecycle(
    'request',
    getAction,
    router.extensions,
    [route, routes, request]
  );
}

function getRequestHandler() {
  return requestHandler;
}

module.exports = getRequestHandler;
