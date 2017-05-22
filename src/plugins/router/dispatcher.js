// @flow
import type { ServiceRequest } from '../../types';

/**
 * Project deps
 * @private
 */
const is = require('is');
const Promise = require('bluebird');
const debug = require('debug')('mservice:router:dispatch');

function dispatch(route: string, request: ServiceRequest, callback?: () => mixed): Promise<any> | void {
  const router = this;
  const { modules } = router;

  debug('initiating request on route %s', route);

  const result = Promise
    .bind(router.service, [route, request])
    .spread(modules.request)
    .then(modules.auth)
    .then(modules.validate)
    .then(modules.allowed)
    .then(modules.handler);

  if (is.fn(callback)) {
    debug('attaching response via callback');
    return result.asCallback(router.modules.response(callback, request));
  }

  debug('returning promise without the result');
  return result;
}

module.exports = dispatch;
