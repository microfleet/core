const moduleLifecycle = require('./lifecycle');
const Promise = require('bluebird');

function handler(request, action, router) {
  if (action.handler === null) {
    // @todo add error
    return Promise.reject();
  }

  return moduleLifecycle('handler', action.handler, router.extensions, [request, action, router]);
}

function getHandler(config) {
  return handler;
}

module.exports = getHandler;
