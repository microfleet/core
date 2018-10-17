import Bluebird = require('bluebird')
import { ArgumentError, AuthenticationRequiredError, NotImplementedError } from 'common-errors'
import is = require('is')
import { Microfleet } from '../../../'
import { AuthConfig, ServiceRequest } from '../../../types'
import moduleLifecycle from './lifecycle'

const remapError = (error: Error) => {
  if (error.constructor === AuthenticationRequiredError) {
    return Bluebird.reject(error)
  }

  return Bluebird.reject(new AuthenticationRequiredError(error.message, error))
}

const assignTo = (container: any, prop: string) => (value: any) => {
  container[prop] = value ? { credentials: value } : value
}

const reject = (e: Error): any => Bluebird.reject(e)
const setToNull = () => null
const isObligatory = (strategy: string) => {
  switch (strategy) {
    case 'try':
      return setToNull

    default:
      return reject
  }
}

const retrieveStrategy = (request: ServiceRequest, strategies: any) => {
  const { action } = request
  const authConfig = action.auth

  // prepare vars
  let getAuthName
  let passAuthError
  let authStrategy

  // new way of complex auth object
  if (is.object(authConfig)) {
    getAuthName = (authConfig as AuthConfig).name
    authStrategy = (authConfig as AuthConfig).strategy || 'required'
    passAuthError = (authConfig as AuthConfig).passAuthError || false
  } else {
    getAuthName = authConfig
    authStrategy = 'required'
    passAuthError = action.passAuthError || false
  }

  // find name
  const name = typeof getAuthName === 'function'
    ? getAuthName(request)
    : getAuthName as string
  const strategy = strategies[name]

  // no strat - fail
  if (strategy == null) {
    return {
      authStrategy,
      name,
      passAuthError,
      strategy: null,
    }
  }

  return {
    authStrategy,
    name,
    passAuthError,
    strategy,
  }
}

function auth(this: Microfleet, request: ServiceRequest, strategies: any) {
  const authSchema = retrieveStrategy(request, strategies)

  if (authSchema.strategy == null) {
    return Bluebird.reject(new NotImplementedError(authSchema.name))
  }

  const promise = Bluebird
    .resolve(request)
    .bind(this)
    .then(authSchema.strategy)
    .catch(isObligatory(authSchema.authStrategy))
    .tap(assignTo(request, 'auth'))
    .return(request)

  if (authSchema.passAuthError) {
    return promise
  }

  return promise.catch(remapError)
}

function assignStrategies(strategies: any) {
  return function authHandler(this: Microfleet, request: ServiceRequest): PromiseLike<any> {
    const { action } = request

    if (action === undefined) {
      return Bluebird.reject(new ArgumentError('"request" must have property "action"'))
    }

    if (is.undefined(action.auth)) {
      return Bluebird.resolve(request)
    }

    return moduleLifecycle('auth', auth, this.router.extensions, [request, strategies], this)
  }
}

function getAuthHandler(config: any) {
  const strategies = Object.assign(Object.create(null), config.strategies)
  return assignStrategies(strategies)
}

export default getAuthHandler
