import { Microfleet } from '@microfleet/core'
import type { PluginInterface } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'

import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-router'
import type * as ___ from './overrides'

import { Rbac } from './rbac'
import { canExtension } from './allowed-extension'

export * from './rbac'

/**
 * Plugin Name
 */
export const name = 'casl-rbac'

/**
 * Plugin Type
 */
export const type = PluginTypes.transport

/**
 * Relative priority inside the same plugin group type
 */
export const priority = 15

/**
 * Attaches plugin to the MService class.
 */
export function attach(this: Microfleet): PluginInterface {
  if (this.hasPlugin('router')) {
    this.router.lifecycle.addHook(canExtension)
  }

  const { rbac } = this.config

  this.rbac = new Rbac(rbac)

  return {}
}
