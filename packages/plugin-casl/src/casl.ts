import { NotFoundError } from 'common-errors'
import { resolve } from 'path'
import { strict as assert } from 'assert'

import { Microfleet } from '@microfleet/core'
import type { PluginInterface } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'

import type * as _ from './overrides'

import { Rbac, RbacConfig } from './rbac'
import { rbacExtension } from './allowed-extension'

export * from './rbac'

/**
 * Plugin Name
 */
export const name = 'casl'

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
export function attach(this: Microfleet, opts: Partial<RbacConfig> = {}): PluginInterface {
  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  const config = this.validator.ifError<RbacConfig>(name, opts)

  if (this.hasPlugin('router')) {
    this.router.lifecycle.addHook(rbacExtension)
  }

  this.rbac = new Rbac(config)

  return {}
}
