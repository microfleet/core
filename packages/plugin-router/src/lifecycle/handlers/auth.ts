import { AuthenticationRequiredError, NotImplementedError } from 'common-errors'
import { isObject, isString } from 'lodash'
import { Microfleet } from '@microfleet/core'

import { ServiceRequest } from '../../types/router'
import {
  RouterPluginConfig,
  RouterPluginAuthStrategy,
  RouterPluginAuthConfig,
} from '../../types/plugin'

export interface AuthStrategyConfig {
  name: string
  authStrategy: 'required' | 'try'
  passAuthError: boolean,
  strategy: RouterPluginAuthStrategy | null
}

function retrieveStrategy(request: ServiceRequest, strategies: RouterPluginAuthConfig['strategies']): AuthStrategyConfig {
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

export default async function authHandler(
  this: Microfleet,
  request: ServiceRequest,
  config: RouterPluginConfig
): Promise<void> {
  if (request.action.auth === undefined) {
    return
  }

  // @todo avoid object creation
  const authConfig = retrieveStrategy(request, config.auth.strategies)

  if (authConfig.strategy === null) {
    throw new NotImplementedError(authConfig.name)
  }

  try {
    // @todo make it depricated, change request.auth inside
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
