const is = require('is');
const Promise = require('bluebird');
const debug = require('debug')('mservice:router:dispatch');

function dispatch(route, request, callback) {
  const router = this;

  debug('initiating request on route %s', route);

  const result = Promise
    .bind(router.service, [route, request])
    .spread(router.modules.request)
    .then(router.modules.auth)
    .then(router.modules.validate)
    .then(router.modules.allowed)
    .then(router.modules.handler);

  if (is.fn(callback)) {
    debug('attaching response via callback');
    return result.asCallback(router.modules.response(callback, request));
  }

  debug('returning promise without the result');
  return result;
}

module.exports = dispatch;
