"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const common_errors_1 = require("common-errors");
const __1 = require("../");
const require_1 = require("../utils/require");
/**
 * Plugin Name
 */
exports.name = 'opentracing';
/**
 * Plugin Type
 */
exports.type = __1.PluginTypes.essential;
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 50;
/**
 * Attaches plugin to the MService class.
 * @param opts - AMQP plugin configuration.
 */
function attach(opts = {}) {
    const { initTracer } = require_1.default('jaeger-client');
    assert(this.hasPlugin('logger'), new common_errors_1.NotFoundError('log module must be included'));
    const settings = this.validator.ifError('opentracing', opts);
    // init tracer
    this.tracer = initTracer(settings.config, {
        ...settings.options,
        logger: this.log,
    });
}
exports.attach = attach;
//# sourceMappingURL=opentracing.js.map