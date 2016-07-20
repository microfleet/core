const Errors = require('common-errors');

function verifyAttachPossibility(router, transportName) {
  const routesConfig = router.config.routes;

  if (routesConfig.transports.includes(transportName) === false) {
    throw new Errors.NotSupportedError(`${transportName} not in "router" module config`);
  }
}

module.exports = verifyAttachPossibility;
