"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const retry = require("bluebird-retry");
const constants_1 = require("../constants");
class PluginHealthStatus {
    constructor(name, alive = true, error) {
        this.name = name;
        this.status = alive ? constants_1.PLUGIN_STATUS_OK : constants_1.PLUGIN_STATUS_FAIL;
        this.error = error;
    }
}
exports.PluginHealthStatus = PluginHealthStatus;
class PluginHealthCheck {
    constructor(name, handler) {
        this.name = name;
        this.handler = handler;
    }
}
exports.PluginHealthCheck = PluginHealthCheck;
/**
 * Walks thru attached status getters and returns a summary system state.
 * @param {Array<PluginHealthCheck>} handlers - Array of plugin health checkers.
 * @param {Object} _opts - Retry options.
 * @returns {Promise<{status: string, alive: Array, failed: Array}>} A current service state.
 */
async function getHealthStatus(handlers, config) {
    // retry options
    // https://www.npmjs.com/package/bluebird-retry
    // eslint-disable-next-line @typescript-eslint/camelcase
    const opts = { ...config, throw_original: true, context: this };
    const alive = [];
    const failed = [];
    await Bluebird.each(handlers, async ({ name, handler }) => {
        try {
            await retry(handler, opts);
            alive.push(new PluginHealthStatus(name, true));
        }
        catch (e) {
            failed.push(new PluginHealthStatus(name, false, e));
        }
    });
    return {
        alive,
        failed,
        status: !failed.length ? constants_1.PLUGIN_STATUS_OK : constants_1.PLUGIN_STATUS_FAIL,
    };
}
exports.getHealthStatus = getHealthStatus;
//# sourceMappingURL=pluginHealthStatus.js.map