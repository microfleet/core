import { Rbac, RuleDefinition } from './rbac'

declare module '@microfleet/core-types' {
  interface Microfleet {
    rbac: Rbac
  }
}

declare module '@microfleet/plugin-router' {
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
