// @flow
import type { PluginInterface } from '../types';

/**
 * Project deps
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
 * Helper configuration validator
 */
function validateConfig(config: Object, validator: () => { error: ?Error, doc: ?mixed }) {
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

exports.attach = function createHttpServer(config: Object): PluginInterface {
  validateConfig(config, this.validateSync);
  // eslint-disable-next-line import/no-dynamic-require
  const handler = require(`./http/handlers/${config.server.handler}`);

  return handler(config, this);
};
