import Bluebird from 'bluebird'

import Router from '../router'
import { ServiceRequest } from './router'
import { AuthConfig } from '../lifecycle/actions/auth'
import { ValidateResponseConfig } from '../lifecycle/actions/validate-response'
import { CoreLifecycleOptionsExtension } from '../lifecycle/core'

declare module '@microfleet/core' {
  export interface Microfleet {
    router: Router
    dispatch: (route: string, request: Partial<ServiceRequest>) => Bluebird<any>
  }

  export interface ConfigurationOptional {
    router: RouterPluginConfig
  }
}

export type RouterPluginConfig = {
  auth: AuthConfig
  extensions: {
    register: CoreLifecycleOptionsExtension[]
  }
  routes: RouterPluginRoutesConfig
}

export interface RouterPluginRoutesConfig {
  directory?: string
  enabled?: Record<string, string>
  prefix?: string
  responseValidation?: ValidateResponseConfig
  enabledGenericActions?: string[]
}
