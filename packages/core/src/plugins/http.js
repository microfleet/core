"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const common_errors_1 = require("common-errors");
const __1 = require("../");
/**
 * Plugin Name
 */
exports.name = 'http';
/**
 * Plugin Type
 */
exports.type = __1.PluginTypes.transport;
/**
 * Relative priority inside the same plugin group type
 */
exports.priority = 0;
/**
 * Attaches HTTP handler.
 * @param config - HTTP handler configuration to attach.
 */
function attach(opts = {}) {
    const { validator } = this;
    assert(this.hasPlugin('validator'), new common_errors_1.NotFoundError('validator module must be included'));
    const config = validator.ifError('http', opts);
    // server specific config
    if (config.server && config.server.handlerConfig) {
        config.server.handlerConfig = validator.ifError(`http.${config.server.handler}`, config.server.handlerConfig);
    }
    const handler = require(`./http/handlers/${config.server.handler}`).default;
    return handler(config, this);
}
exports.attach = attach;
//# sourceMappingURL=http.js.map