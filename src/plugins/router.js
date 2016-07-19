const assert = require('assert');
const debug = require('debug')('mservice:attach:router');
const getRouter = require('./router/factory');

/**
 * @param {Object} config
 */
function attachRouter(config) {
  debug('Attaching router plugin');

  /** @type {Mservice} */
  const service = this;

  assert(service.log);
  assert(service.validator);
  assert.ifError(service.validator.validateSync('router', config).error);
  config.routes.transports.forEach(transport => assert(service.config.plugins.includes(transport)));

  this._router = getRouter(config, service);
}

module.exports = {
  attach: attachRouter,
  name: 'router',
};
