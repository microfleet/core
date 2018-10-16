const assert = require('assert');

const findByName = pluginName => i => (
  pluginName === i.name
);

/**
 * Returns a registered health check by plugin name
 * @param service link to Mservice
 * @param pluginName name of a plugin to perform look up.
 * @returns {Object}  a health check module
 */
exports.findHealthCheck = function findHealthCheck(service, pluginName) {
  const check = service
    .getHealthChecks()
    .find(findByName(pluginName));
  assert(check);
  return check;
};
