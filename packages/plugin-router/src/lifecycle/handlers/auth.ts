import { AuthenticationRequiredError, NotImplementedError } from 'common-errors'
import { isObject, isString } from 'lodash'
import { Microfleet } from '@microfleet/core'

import { ServiceRequest, ServiceActionHandler } from '../../types/router'

export type AuthStrategy = ServiceActionHandler
export interface AuthConfig {
  readonly strategies: Record<string, AuthStrategy>
}

export interface AuthStrategyConfig {
  name: string
  authStrategy: 'required' | 'try'
  passAuthError: boolean,
  strategy: AuthStrategy | null
}

function retrieveStrategy(request: ServiceRequest, strategies: AuthConfig['strategies']): AuthStrategyConfig {
  const { action } = request
  const { auth: authConfig } = action

  // for ```MicrofleetAction.auth = (request) => assert(request.param)```
  if (typeof authConfig === 'function') {
    const name = authConfig(request)

    return {
      name,
      authStrategy: 'required',
      passAuthError: action.passAuthError || false,
      strategy: strategies[name] || null
    }
  }

  // for ```MicrofleetAction.auth = 'token'```
  if (isString(authConfig)) {
    const name = authConfig

    return {
      name,
      authStrategy: 'required',
      passAuthError: action.passAuthError || false,
      strategy: strategies[name] || null
    }
  }

  // for ```MicrofleetAction.auth = {
  //   name: 'token',
  //   authStrategy: 'try',
  // }```
  if (isObject(authConfig)) {
    const name = authConfig.name

    return {
      name,
      authStrategy: authConfig.strategy || 'required',
      passAuthError: authConfig.passAuthError || false,
      strategy: strategies[name] || null
    }
  }

  throw new Error(`authConfig is invalid: ${authConfig}`)
}

export default (config: AuthConfig) => async function authHandler(
  this: Microfleet,
  request: ServiceRequest,
): Promise<void> {
  if (request.action.auth === undefined) {
    return
  }

  // @todo avoid object creation
  const authConfig = retrieveStrategy(request, config.strategies)

  if (authConfig.strategy === null) {
    throw new NotImplementedError(authConfig.name)
  }

  try {
    // @todo make it deprecated, change request.auth inside
    request.auth = { credentials: await authConfig.strategy.call(this, request) }
  } catch (error: any) {
    // @todo const 'try'
    if (authConfig.authStrategy === 'try') {
      request.auth = null
    } else {
      if (authConfig.passAuthError) {
        throw error
      }

      if (error.constructor === AuthenticationRequiredError) {
        throw error
      }

      throw new AuthenticationRequiredError(error.message, error)
    }
  }
}
