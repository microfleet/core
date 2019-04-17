import { HttpStatusError } from '@microfleet/validation'
import Bluebird = require('bluebird')
import { Error } from 'common-errors'
import is = require('is')
import { Microfleet } from '../../../'
import { DATA_KEY_SELECTOR } from '../../../constants'
import { ServiceRequestInterface } from '../../../types'
import { ValidatorPlugin } from '../../validator'
import moduleLifecycle from './lifecycle'

type ValidationObject = {
  request: ServiceRequestInterface,
  paramsKey: 'query' | 'params',
}

function validationSuccess(this: ValidationObject, sanitizedParams: any): ServiceRequestInterface {
  this.request[this.paramsKey] = sanitizedParams
  return this.request
}

const handleValidationError = (error: Error) => {
  if (error.constructor === HttpStatusError) {
    throw error
  }

  throw new Error('internal validation error', error)
}

function validate(this: Microfleet & ValidatorPlugin, request: ServiceRequestInterface) {
  const { validator } = this
  const paramsKey = DATA_KEY_SELECTOR[request.method]

  return validator
    .validate(request.action.schema as string, request[paramsKey])
    .bind({ request, paramsKey })
    .then(validationSuccess, handleValidationError)
}

function passThrough(request: ServiceRequestInterface): ServiceRequestInterface {
  return request
}

function validateHandler(this: Microfleet & ValidatorPlugin, request: ServiceRequestInterface): Bluebird<any>  {
  const validateFn = is.undefined(request.action.schema)
    ? passThrough
    : validate

  return moduleLifecycle('validate', validateFn, this.router.extensions, [request], this)
}

export default validateHandler
