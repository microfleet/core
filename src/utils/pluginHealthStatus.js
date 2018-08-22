const Promise = require('bluebird');
const retry = require('bluebird-retry');

const { PLUGIN_STATUS_OK, PLUGIN_STATUS_FAIL } = require('../constants');

function PluginHealthStatus(name: string, alive: boolean = true, error?: Error) {
  this.name = name;
  this.status = alive ? PLUGIN_STATUS_OK : PLUGIN_STATUS_FAIL;
  this.error = error;
}

function PluginHealthCheck(name: string, handler: Function) {
  this.name = name;
  this.handler = handler;
}

/**
 * Walks thru attached status getters and returns a summary system state.
 * @param {Array<PluginHealthCheck>} handlers - Array of plugin health checkers.
 * @param {Object} _opts - Retry options.
 * @returns {Promise<{status: string, alive: Array, failed: Array}>} A current service state.
 */
async function getHealthStatus(handlers: Array<PluginHealthCheck>, _opts: Object): Object {
  // retry options
  // https://www.npmjs.com/package/bluebird-retry
  const opts = { ..._opts, throw_original: true };
  const alive = [];
  const failed = [];


  await Promise.each(handlers, async ({ name, handler }) => {
    try {
      await retry(handler, opts);
      alive.push(new PluginHealthStatus(name, true));
    } catch (e) {
      failed.push(new PluginHealthStatus(name, false, e));
    }
  });

  return {
    status: !failed.length ? PLUGIN_STATUS_OK : PLUGIN_STATUS_FAIL,
    alive,
    failed,
  };
}

exports.getHealthStatus = getHealthStatus;
exports.PluginHealthCheck = PluginHealthCheck;
exports.PluginHealthStatus = PluginHealthStatus;
