const assert = require('assert');
const debug = require('debug')('mservice:attach:router');
const Errors = require('common-errors');
const is = require('is');
const getRouter = require('./router/factory');

/**
 * @param {Object} config
 */
function attachRouter(config) {
  debug('Attaching router plugin');

  /** @type {Mservice} */
  const service = this;

  if (is.undefined(service._log) === true) {
    throw new Errors.NotFoundError('log module must be included');
  }

  if (is.undefined(service._validator) === true) {
    throw new Errors.NotFoundError('validator module must be included');
  }

  assert.ifError(service.validator.validateSync('router', config).error);
  config.routes.transports.forEach(transport => {
    if (service.config.plugins.includes(transport) === false) {
      throw new Errors.NotSupportedError(`transport ${transport}`);
    }
  });

  this._router = getRouter(config, service);
}

module.exports = {
  attach: attachRouter,
  name: 'router',
};
