// @flow

/**
 * Project deps
 * @private
 */
const is = require('is');
const assert = require('assert');
const _require = require('@microfleet/utils').require;
const { PluginsTypes } = require('@microfleet/config').constants;

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
 * @param {Object} settings - AMQP plugin configuration.
 */
exports.attach = function attachOpentracing(settings: Object): void {
  const { initTracer } = _require('jaeger-client');

  // optional validation with the plugin
  if (is.fn(this.validateSync)) {
    assert.ifError(this.validateSync('opentracing', settings).error);
  }

  // push logger over
  if (is.fn(this._log)) {
    settings.options.logger = this._log;
  }

  // init tracer
  this._tracer = initTracer(settings.config, settings.options);
};
