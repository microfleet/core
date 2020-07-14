import { HttpStatusError } from '@microfleet/validation'
import Bluebird = require('bluebird')
import { Error } from 'common-errors'

import { Microfleet } from '../../..'

import { ServiceRequest } from '../../../types'
import { ValidatorPlugin } from '../../validator'
import moduleLifecycle from './lifecycle'

type HandlerResult = [Error | null, any, ServiceRequest]

async function validate(
  this: Microfleet & ValidatorPlugin,
  err: Error | null, response: any, request: ServiceRequest,
): Promise<HandlerResult> {
  // do nothing with errors
  if (err) [err, response, request]

  const { validator } = this
  const { action } = request
  try {
    await validator.validate(action.responseSchema as string, response)
    return [null, response, request]
  } catch (error) {
    if (error.constructor === HttpStatusError) {
      throw error
    }
    throw new Error('internal response validation error', error)
  }
}

function passThrough(
  this: Microfleet & ValidatorPlugin,
  err: Error | null, response: any, request: ServiceRequest,
): HandlerResult {
  return [err, response, request]
}

function validateResponseHandler(this: Microfleet, params: [Error | null, any, ServiceRequest]): Bluebird<any> {
  const [,, request] = params
  const { validateResponse } = this.router.config.routes
  const { validateResponse: actionValidateResponse } = request.action

  const validateFn = validateResponse && (actionValidateResponse !== false) ? validate : passThrough

  return moduleLifecycle('validate-response', validateFn, this.router.extensions, params, this)
}

export default validateResponseHandler
