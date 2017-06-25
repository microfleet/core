// @flow

/**
 * Project deps
 * @private
 */
const is = require('is');
const assert = require('assert');
const _require = require('../utils/require');
const { PluginsTypes } = require('../constants');

/**
 * Plugin Name
 * @type {String}
 */
exports.name = 'opentracing';

/**
 * Plugin Type
 * @type {String}
 */
exports.type = PluginsTypes.essential;

/**
 * Attaches plugin to the MService class.
 * @param {Object} config - AMQP plugin configuration.
 */
exports.attach = function attachOpentracing(config: Object): void {
  const initTracer = _require('jaeger-client').initTracer;

  // optional validation with the plugin
  if (is.fn(this.validateSync)) {
    assert.ifError(this.validateSync('opentracing', config).error);
  }

  // init tracer
  this._tracer = initTracer(config);
};
