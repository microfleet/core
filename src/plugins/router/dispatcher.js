const is = require('is');
const Promise = require('bluebird');

function dispatch(route, request, callback) {
  const router = this;

  const result = Promise
    .resolve([route, request])
    .bind(router.service)
    .spread(router.modules.request)
    .then(router.modules.auth)
    .then(router.modules.validate)
    .then(router.modules.allowed)
    .then(router.modules.handler);

  if (is.fn(callback)) {
    return result.asCallback(router.modules.response(callback, request));
  }

  return result;
}

module.exports = dispatch;
