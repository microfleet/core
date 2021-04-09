import { strict as assert } from 'assert'
import { Microfleet } from "@microfleet/core"

export type HealthCheck = {
  handler: () => Promise<boolean>;
}

const findByName = (pluginName: string) => (i: any) => (
  pluginName === i.name
)

/**
 * Returns a registered health check by plugin name
 * @param service link to Mservice
 * @param pluginName name of a plugin to perform look up.
 * @returns {Object}  a health check module
 * @todo test util (there are duplicates)
 */
export function findHealthCheck(service: Microfleet, pluginName: string): HealthCheck {
  const check = service
    .getHealthChecks()
    .find(findByName(pluginName))

  assert(check)

  return {
    ...check,
    handler: check.handler.bind(service),
  }
}
