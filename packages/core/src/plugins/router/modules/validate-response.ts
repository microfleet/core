import { HttpStatusError } from '@microfleet/validation'
import Bluebird = require('bluebird')
import { Error } from 'common-errors'

import { Microfleet } from '../../..'

import { ServiceRequest } from '../../../types'
import { ValidatorPlugin } from '../../validator'

import moduleLifecycle from './lifecycle'

type HandlerResult = [Error | null, any, ServiceRequest]
type WithValidatorPlugin = Microfleet & ValidatorPlugin

function handleValidationError(service: Microfleet, err: Error): void {
  const { responseValidation } = service.router.config.routes
  if (responseValidation.panic) {
    if (err.constructor === HttpStatusError) {
      throw err
    }
    throw new Error('internal response validation error', err)
  }
}

async function validate(this: WithValidatorPlugin, err: Error | null, response: any, request: ServiceRequest): Promise<HandlerResult> {
  // do nothing with errors
  if (err) return [err, response, request]

  const { validator } = this
  const { action } = request

  try {
    await validator.validate(action.responseSchema as string, response)
    return [null, response, request]
  } catch (err) {
    handleValidationError(this, err)
    this.log.warn({ err, action: action.actionName }, '[response] validation failed')
    return [null, response, request]
  }
}

function passThrough(this: WithValidatorPlugin, err: Error | null, response: any, request: ServiceRequest): HandlerResult {
  return [err, response, request]
}

function validateResponseHandler(this: Microfleet, params: [Error | null, any, ServiceRequest]): Bluebird<any> {
  const [,, request] = params
  const { responseValidation } = this.router.config.routes
  const { enabled, maxSample } = responseValidation
  const { validateResponse } = request.action
  const shouldValidate = Math.round(Math.random() * 100) <= maxSample

  const validateFn = enabled && (validateResponse !== false) && shouldValidate ? validate : passThrough

  return moduleLifecycle('validate-response', validateFn, this.router.extensions, params, this)
}

export default validateResponseHandler
