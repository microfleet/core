import { HttpStatusError } from '@microfleet/validation'
import Bluebird = require('bluebird')
import { Error } from 'common-errors'
import is = require('is')
import { Microfleet } from '../../..'

import { ServiceRequest } from '../../../types'
import { ValidatorPlugin } from '../../validator'
import moduleLifecycle from './lifecycle'

async function validate(
  this: Microfleet & ValidatorPlugin,
  request: ServiceRequest,
  err: Error | null,
  response: any
): Promise<ServiceRequest> {
  // do nothing with errors
  if (err) throw err

  const { validator } = this
  const { action } = request
  try {
    await validator.validate(action.responseSchema as string, response)
    return response
  } catch (error) {
    if (error.constructor === HttpStatusError) {
      throw error
    }
    throw new Error('internal validation error', error)
  }
}

function passThrough(response: any): ServiceRequest {
  return response
}

function validateHandler(this: Microfleet & ValidatorPlugin, request: ServiceRequest): Bluebird<any>  {
  const validateFn = is.undefined(request.action.responseSchema)
    ? passThrough
    : validate

  return moduleLifecycle('request-validate', validateFn, this.router.extensions, [request], this)
}

export default validateHandler
