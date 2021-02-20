import { Microfleet } from '@microfleet/core'

import requestHandler from './handlers/request'
import authHandler, { AuthConfig } from './handlers/auth'
import validateHandler from './handlers/validate'
import allowedHandler from './handlers/allowed'
import actionHandler from './handlers/handler'
import validateResponseHandler, { ValidateResponseConfig } from './handlers/validate-response'
import responseHandler from './handlers/response'
import { runHandler } from './utils'

import type { ServiceMiddleware, ServiceRequest } from '../types/router'

export type LifecycleExtension = {
  point: Hook
  handler: ServiceMiddleware
}

export type CoreLifecycleOptions = {
  config: CoreLifecycleOptionsConfig
  context: Microfleet
  extensions: LifecycleExtensions[]
}

export type CoreLifecycleOptionsConfig = {
  auth: AuthConfig
  validateResponse?: ValidateResponseConfig
}

export type LifecycleExtensions = LifecycleExtension[]
export type HooksCollection = Set<ServiceMiddleware>
export type Hooks = Map<Hook, Set<ServiceMiddleware>>
export type Hook = typeof preAllowed
  | typeof postAllowed
  | typeof preAuth
  | typeof postAuth
  | typeof preHandler
  | typeof postHandler
  | typeof preRequest
  | typeof postRequest
  | typeof preResponse
  | typeof postResponse
  | typeof preValidate
  | typeof postValidate
  | typeof preValidateResponse
  | typeof postValidateResponse

const preAllowed = 'preAllowed'
const postAllowed = 'postAllowed'
const preAuth = 'preAuth'
const postAuth = 'postAuth'
const preHandler = 'preHandler'
const postHandler = 'postHandler'
const preRequest = 'preRequest'
const postRequest = 'postRequest'
const preResponse = 'preResponse'
const postResponse = 'postResponse'
const preValidate = 'preValidate'
const postValidate = 'postValidate'
const preValidateResponse = 'preValidateResponse'
const postValidateResponse = 'postValidateResponse'

export default class Lifecycle {
  public static hooks: Record<Hook, Hook> = {
    preAllowed,
    postAllowed,
    preAuth,
    postAuth,
    preHandler,
    postHandler,
    preRequest,
    postRequest,
    preResponse,
    postResponse,
    preValidate,
    postValidate,
    preValidateResponse,
    postValidateResponse,
  }

  protected config: CoreLifecycleOptionsConfig

  protected context: Microfleet

  protected hooks: Map<Hook, HooksCollection> = new Map()

  protected authHandler: ServiceMiddleware

  protected validateResponseHandler: ServiceMiddleware

  constructor({ config, extensions, context }: CoreLifecycleOptions) {
    const { validateResponse, auth } = config

    this.config = config
    this.context = context

    this.initHooks(extensions)

    this.authHandler = authHandler(auth)
    this.validateResponseHandler = validateResponseHandler(validateResponse)
  }

  protected initHooks(extensions: LifecycleExtensions[]): void {
    for (const hook of Object.keys(Lifecycle.hooks) as Hook[]) {
      this.hooks.set(hook, new Set())
    }

    for (const extension of extensions) {
      for (const { point, handler } of extension) {
        const hooks = this.hooks.get(point)

        if (hooks !== undefined) {
          hooks.add(handler)
        } else {
          throw new Error('Unknown hook name')
        }
      }
    }
  }

  public async run(request: ServiceRequest): Promise<void> {
    const { context, hooks } = this

    try {
      await runHandler(requestHandler, hooks, preRequest, postRequest, context, request)
      await runHandler(this.authHandler, hooks, preAuth, postAuth, context, request)
      await runHandler(validateHandler, hooks, preValidate, postValidate, context, request)
      await runHandler(allowedHandler, hooks, preAllowed, postAllowed, context, request)
      await runHandler(actionHandler, hooks, preHandler, postHandler, context, request)
      await runHandler(this.validateResponseHandler, hooks, preValidateResponse, postValidateResponse, context, request)
    } catch (error: any) {
      request.error = error
    } finally {
      await runHandler(responseHandler, hooks, preResponse, postResponse, context, request)
    }
  }
}
