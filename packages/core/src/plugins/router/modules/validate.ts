import { HttpStatusError } from '@microfleet/validation'
import Bluebird = require('bluebird')
import { ArgumentError, Error } from 'common-errors'
import is = require('is')
import { Microfleet } from '../../../'
import { DATA_KEY_SELECTOR } from '../../../constants'
import { ServiceRequest } from '../../../types'
import moduleLifecycle from './lifecycle'

function validationSuccess(this: any, sanitizedParams: any) {
  this.request[this.paramsKey] = sanitizedParams
  return this.request
}

const handleValidationError = (error: Error) => {
  if (error.constructor === HttpStatusError) {
    throw error
  }

  throw new Error('internal validation error', error)
}

function validate(this: Microfleet, request: ServiceRequest) {
  const { validator } = this
  const paramsKey = DATA_KEY_SELECTOR[request.method]

  return validator
    .validate(request.action.schema, request[paramsKey as 'query' | 'params'])
    .bind({ request, paramsKey })
    .then(validationSuccess, handleValidationError)
}

function validateHandler(this: Microfleet, request: ServiceRequest)  {
  if (request.action === undefined) {
    return Bluebird.reject(new ArgumentError('"request" must have property "action"'))
  }

  if (is.undefined(request.action.schema)) {
    return Bluebird.resolve(request)
  }

  return moduleLifecycle('validate', validate, this.router.extensions, [request], this)
}

export default validateHandler
