// @flow
const assert = require('assert');
const debug = require('debug')('mservice:attach:router');
const { NotFoundError, NotSupportedError } = require('common-errors');
const is = require('is');
const getRouter = require('./router/factory');
const { PluginsTypes } = require('../constants');

/**
 * Plugin Name
 * @type {String}
 */
exports.name = 'router';

/**
 * Plugin Type
 * @type {String}
 */
exports.type = PluginsTypes.essential;

/**
 * @param {Object} config
 */
exports.attach = function attachRouter(config: Object): void {
  debug('Attaching router plugin');

  /** @type {Mservice} */
  const service = this;

  if (is.undefined(service._log) === true) {
    throw new NotFoundError('log module must be included');
  }

  if (is.undefined(service._validator) === true) {
    throw new NotFoundError('validator module must be included');
  }

  assert.ifError(service.validator.validateSync('router', config).error);

  config.routes.transports.forEach((transport) => {
    if (service.config.plugins.includes(transport) === false) {
      throw new NotSupportedError(`transport ${transport}`);
    }
  });

  this._router = getRouter(config, service);
};
