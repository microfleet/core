import { Microfleet } from '@microfleet/core'
import type { PluginInterface } from '@microfleet/core-types'
import { PluginTypes } from '@microfleet/utils'

import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-router'
import type * as ___ from '@microfleet/plugin-router/src/lifecycle/handlers/auth'

import { Rbac, RuleDefinition } from './casl-wrapper'
import { canExtension } from './allowed-extension'

declare module '@microfleet/core-types' {
  interface Microfleet {
    rbac: Rbac
  }
}

declare module '@microfleet/plugin-router/src/lifecycle/handlers/auth' {
  interface AuthInfo {
    scopes?: RuleDefinition
  }
}

declare module '@microfleet/plugin-router' {
  interface ServiceAction {
    rbacScope?: {
      subject: string,
      action: string,
    }
  }
}

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

  this.rbac = new Rbac()

  return {}
}
