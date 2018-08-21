const Promise = require('bluebird');
const retry = require('bluebird-retry');

const { PLUGIN_STATUS_OK, PLUGIN_STATUS_FAIL } = require('../constants');

function PluginHealthStatus(name: string, alive: boolean = true, error?: Error): PluginHealthStatus {
  this.name = name;
  this.status = alive ? PLUGIN_STATUS_OK : PLUGIN_STATUS_FAIL;
  this.error = error;
}

function PluginHealthCheck(name: string, handler: Function): PluginHealthCheck {
  return {
    name,
    handler,
  };
}

const retryOpts = {
  throw_original: true,
};

async function getHealthStatus(handlers: Array<PluginHealthCheck>, _opts: Object): Object {
  const alive = [];
  const failed = [];
  const opts = { ...retryOpts, ..._opts };

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
