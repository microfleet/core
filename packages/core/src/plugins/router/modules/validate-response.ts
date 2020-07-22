import { HttpStatusError } from '@microfleet/validation'
import Bluebird = require('bluebird')
import { Error } from 'common-errors'

import { Microfleet } from '../../..'

import { ServiceRequest } from '../../../types'
import { ValidatorPlugin } from '../../validator'
import { RuntimeMeta } from '../runtime-meta'

import moduleLifecycle from './lifecycle'

type HandlerResult = [Error | null, any, ServiceRequest]

function shouldValidate(meta: RuntimeMeta['responseValidation'], percent: number): boolean {
  if (! meta.firstHit) {
    meta.firstHit = true
    return true
  }

  if ((percent/100) * meta.hits >= 1) {
    meta.hits = 0
    return true
  }
  return false
}

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
  const { responseValidation } = this.router.config.routes
  const { enabled, percent } = responseValidation
  const { validateResponse, actionName } = request.action

  const { meta } = this.router

  const { responseValidation: actionValidationMeta } = meta.getOrDefault(actionName) as RuntimeMeta
  const percentReached = shouldValidate(actionValidationMeta, percent)

  actionValidationMeta.hits += 1

  const validateFn = enabled && (validateResponse !== false) && percentReached ? validate : passThrough

  return moduleLifecycle('validate-response', validateFn, this.router.extensions, params, this)
}

export default validateResponseHandler
