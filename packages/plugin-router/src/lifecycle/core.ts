import Lifecycle from './abstract'
import { LifecycleExtensions } from '../extensions'
import Runner from '../runner'
import { ServiceRequest, ServiceFn } from '../types/router'

import requestHandler from './actions/request'
import authHandler, { AuthConfig } from './actions/auth'
import validateHandler from './actions/validate'
import allowedHandler from './actions/allowed'
import actionHandler from './actions/handler'
import validateResponseHandler, { ValidateResponseConfig } from './actions/validate-response'
import responseHandler from './actions/response'

export type CoreLifecycleOptions = {
  runner: Runner<ServiceFn, ServiceRequest>
  extensions: LifecycleExtensions[]
  config: CoreLifecycleOptionsConfig
}

export type CoreLifecycleOptionsConfig = {
  auth: AuthConfig
  validateResponse?: ValidateResponseConfig
}

export default class CoreLifecycle extends Lifecycle {
  protected config: CoreLifecycleOptionsConfig

  protected runner: Runner<ServiceFn, ServiceRequest>

  constructor({ config, runner, extensions }: CoreLifecycleOptions) {
    super()
    this.config = config
    this.runner = runner

    for (const extension of extensions) {
      for (const { point, handler } of extension) {
        this.runner.register(point, handler)
      }
    }
  }

  public async run(params: ServiceRequest): Promise<void> {
    const { validateResponse, auth } = this.config

    try {
      await this.runner.runFn('request', requestHandler, params)
      await this.runner.runFn('auth', authHandler, params, auth)
      await this.runner.runFn('validate', validateHandler, params)
      await this.runner.runFn('allowed', allowedHandler, params)
      await this.runner.runFn('handler', actionHandler, params)
      await this.runner.runFn('validateResponse', validateResponseHandler, params, validateResponse)
    } catch (error: any) {
      params.error = error
    } finally {
      await this.runner.runFn('response', responseHandler, params)
    }
  }
}
