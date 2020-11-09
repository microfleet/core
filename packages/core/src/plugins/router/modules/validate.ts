import { HttpStatusError } from '@microfleet/validation'
import Bluebird = require('bluebird')
import { Error } from 'common-errors'
import type { Microfleet, ServiceRequest } from '@microfleet/core-types'
import { DATA_KEY_SELECTOR } from '@microfleet/utils'
import moduleLifecycle from './lifecycle'

type ParamsKey = 'query' | 'params'

async function validate(this: Microfleet, request: ServiceRequest): Promise<ServiceRequest> {
  const { validator } = this
  const paramsKey: ParamsKey = DATA_KEY_SELECTOR[request.method]

  try {
    const validationResult = await validator.validate(request.action.schema as string, request[paramsKey])
    request[paramsKey] = validationResult
    return request
  } catch (error) {
    if (error.constructor === HttpStatusError) {
      throw error
    }
    throw new Error('internal validation error', error)
  }
}

function passThrough(request: ServiceRequest): ServiceRequest {
  return request
}

function validateHandler(this: Microfleet, request: ServiceRequest): Bluebird<any>  {
  const { schema } = request.action

  const validateFn = (schema === undefined || schema === null || schema === false)
    ? passThrough
    : validate

  return moduleLifecycle('validate', validateFn, this.router.extensions, [request], this)
}

export default validateHandler
