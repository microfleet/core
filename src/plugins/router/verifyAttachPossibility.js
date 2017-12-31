// @flow
import type { Router } from './factory';

const Errors = require('common-errors');
const is = require('is');

/**
 * Verifies if it's possible to attach router for specific transport.
 * @param  {Router} router - Existing router instance.
 * @param  {string} transportName - Transport name to attach handler to.
 */
function verifyAttachPossibility(router: Router, transportName: TransportTypes): void {
  if (is.object(router) === false) {
    throw new Errors.NotFoundError('Module "router" not included');
  }

  const routesConfig = router.config.routes;

  if (routesConfig.transports.includes(transportName) === false) {
    throw new Errors.NotSupportedError(`${transportName} not in "router" module config`);
  }
}

module.exports = verifyAttachPossibility;
