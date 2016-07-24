const debug = require('debug')('mservice:router:dispatcher');
const is = require('is');
const Promise = require('bluebird');

function dispatch(route, request, callback) {
  debug('process route "%s" with request "%s"', route, JSON.stringify(request));
  const router = this;

  const result = Promise
    .resolve([route, request])
    .bind(router.service)
    .spread(router.modules.request)
    .then(router.modules.auth)
    .then(router.modules.validate)
    .then(router.modules.allowed)
    .then(router.modules.handler)
    .tap(() => {
      request = null; // eslint-disable-line no-param-reassign
    });

  if (is.fn(callback)) {
    return result.asCallback(router.modules.response(callback, router));
  }

  return result;
}

module.exports = dispatch;
