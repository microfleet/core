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
    scopes?: RuleDefinition
  }

  // Service action plugin config
  interface ServiceAction {
    rbacScope?: {
      subject: string,
      action: string,
    }
  }
}
