// @flow
import type { ValidateSync } from './validator';

/**
 * Project deps
 * @private
 */
const is = require('is');
const assert = require('assert');
const { PluginsTypes } = require('../constants');

/**
 * Plugin Name
 * @type {String}
 */
exports.name = 'http';

/**
 * Plugin Type
 * @type {String}
 */
exports.type = PluginsTypes.transport;

/**
 * Configuration validator helper.
 * @param {Object} config - Configuration to validate.
 * @param {Function} validator - Instance of ms-validation to be used.
 */
function validateConfig(config: Object, validator: ValidateSync) {
  if (is.fn(validator)) {
    // validate core http config
    assert.ifError(validator('http', config).error);

    // validate handler config
    if (config.server.handlerConfig) {
      const validatorName = `http.${config.server.handler}`;
      assert.ifError(validator(validatorName, config.server.handlerConfig).error);
    }
  }
}

/**
 * Attaches HTTP handler.
 * @param  {Object} config - HTTP handler configuration to attach.
 */
exports.attach = function createHttpServer(config: Object): PluginInterface {
  validateConfig(config, this.validateSync);
  // eslint-disable-next-line import/no-dynamic-require
  const handler = require(`./http/handlers/${config.server.handler}`);

  return handler(config, this);
};
