import { HttpStatusError } from '@microfleet/validation'
import Bluebird = require('bluebird')
import { Error } from 'common-errors'
import is = require('is')
import { Microfleet } from '../../../'
import { DATA_KEY_SELECTOR } from '../../../constants'
import { ServiceRequestInterface } from '../../../types'
import { ValidatorPlugin } from '../../validator'
import moduleLifecycle from './lifecycle'

type ParamsKey = 'query' | 'params'

async function validate(this: Microfleet & ValidatorPlugin, request: ServiceRequestInterface): Promise<ServiceRequestInterface> {
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
