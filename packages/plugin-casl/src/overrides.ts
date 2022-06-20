import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-router'

import { Rbac, RbacConfig, RuleDefinition, ActionRbac } from './rbac'

declare module '@microfleet/core-types' {
  interface Microfleet {
    rbac: Rbac
  }

  interface ConfigurationOptional {
    casl: RbacConfig
  }
}

declare module '@microfleet/plugin-router' {
  // Extend credentials
  interface AuthInfo {
    /**
     * Auth middleware should return `scopes` property.
     * The value of this property will be used in ServiceAction access policy validation.
     */
    scopes?: RuleDefinition
  }

  // Service action plugin config
  interface ServiceAction {
    /** RBAC/PBAC specific configuration */
    rbac?: ActionRbac
  }
}
