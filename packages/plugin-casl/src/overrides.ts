import { Rbac, RbacConfig, RuleDefinition } from './rbac'

declare module '@microfleet/core-types' {
  interface Microfleet {
    rbac: Rbac
  }

  interface ConfigurationOptional {
    rbac: RbacConfig
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
    rbacScope?: {
      subject: string,
      action: string,
    }
  }
}
