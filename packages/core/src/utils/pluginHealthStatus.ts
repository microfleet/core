import Bluebird = require('bluebird')
import retry = require('bluebird-retry')
import { PLUGIN_STATUS_FAIL, PLUGIN_STATUS_OK } from '../constants'
import { PluginStatus } from '../types'

export interface HealthStatus {
  alive: PluginHealthStatus[];
  failed: PluginHealthStatus[];
  status: PluginStatus;
}

export class PluginHealthStatus {
  public name: string
  public status: PluginStatus
  public error?: Error

  constructor(name: string, alive = true, error?: Error) {
    this.name = name
    this.status = alive ? PLUGIN_STATUS_OK : PLUGIN_STATUS_FAIL
    this.error = error
  }
}

export class PluginHealthCheck {
  public name: string
  public handler: () => any

  constructor(name: string, handler: () => PromiseLike<any>) {
    this.name = name
    this.handler = handler
  }
}

/**
 * Walks thru attached status getters and returns a summary system state.
 * @param {Array<PluginHealthCheck>} handlers - Array of plugin health checkers.
 * @param {Object} _opts - Retry options.
 * @returns {Promise<{status: string, alive: Array, failed: Array}>} A current service state.
 */
export async function getHealthStatus(handlers: PluginHealthCheck[], config: any): Promise<HealthStatus> {
  // retry options
  // https://www.npmjs.com/package/bluebird-retry
  // eslint-disable-next-line @typescript-eslint/camelcase
  const opts = { ...config, throw_original: true }
  const alive: PluginHealthStatus[] = []
  const failed: PluginHealthStatus[] = []

  await Bluebird.each(handlers, async ({ name, handler }) => {
    try {
      await retry(handler, opts)
      alive.push(new PluginHealthStatus(name, true))
    } catch (e) {
      failed.push(new PluginHealthStatus(name, false, e))
    }
  })

  return {
    alive,
    failed,
    status: !failed.length ? PLUGIN_STATUS_OK : PLUGIN_STATUS_FAIL,
  }
}
