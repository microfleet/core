'use strict';

const Errors = require('common-errors');
const is = require('is');

function verifyAttachPossibility(router, transportName) {
  if (is.object(router) === false) {
    throw new Errors.NotFoundError('Module "router" not included');
  }

  const routesConfig = router.config.routes;

  if (routesConfig.transports.includes(transportName) === false) {
    throw new Errors.NotSupportedError(`${ transportName } not in "router" module config`);
  }
}

module.exports = verifyAttachPossibility;