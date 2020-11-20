import { Microfleet } from '@microfleet/core'

import Runner from './runner'
import { RouterPluginConfig } from '../types/plugin'
import { ServiceRequest } from '../types/router'

import requestHandler from './handlers/request'
import authHandler from './handlers/auth'
import validateHandler from './handlers/validate'
import allowedHandler from './handlers/allowed'
import actionHandler from './handlers/handler'
import validateResponseHandler from './handlers/validate-response'
import responseHandler from './handlers/response'

export default class Lifecycle {
  public static readonly points = {
    preAllowed: 'preAllowed',
    postAllowed: 'postAllowed',
    preAuth: 'preAuth',
    postAuth: 'postAuth',
    preHandler: 'preHandler',
    postHandler: 'postHandler',
    preRequest: 'preRequest',
    postRequest: 'postRequest',
    preResponse: 'preResponse',
    postResponse: 'postResponse',
    preValidate: 'preValidate',
    postValidate: 'postValidate',
  } as const

  protected config: RouterPluginConfig

  protected runner: Runner

  constructor(config: RouterPluginConfig, context: Microfleet) {
    this.config = config
    this.runner = new Runner({ context })

    for (const extension of config.extensions.register) {
      for (const { point, handler } of extension) {
        this.runner.register(point, handler)
      }
    }
  }

  public async run(params: ServiceRequest): Promise<any> {
    await this.runner.run('request', requestHandler, params)
    await this.runner.run('auth', authHandler, params, this.config)
    await this.runner.run('validate', validateHandler, params)
    await this.runner.run('allowed', allowedHandler, params)
    await this.runner.run('handler', actionHandler, params)

    return params.response
  }

  public async runWithResponse(params: ServiceRequest): Promise<any> {
    try {
      await this.run(params)
      await this.runner.run('validateResponse', validateResponseHandler, params, this.config)
    } catch (error: unknown) {
      params.error = error
    }

    await this.runner.run('response', responseHandler, params)

    return params.response
  }
}
