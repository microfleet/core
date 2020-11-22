import { Error } from 'common-errors'
import { Microfleet } from '@microfleet/core'
import { HttpStatusError } from '@microfleet/validation'

import Router from '../../router'
import { ServiceRequest } from '../../types/router'

async function validateHandler(this: Microfleet, request: ServiceRequest): Promise<void> {
  const { validator } = this
  const { schema } = request.action

  // disable validation
  if (schema === null || schema === false) {
    return
  }

  const paramsKey = Router.RequestDataKey[request.method]

  try {
    // @todo (important) handle schema not found error and log it
    const validationResult = await validator.validate(schema as string, request[paramsKey])

    request[paramsKey] = validationResult
  } catch (error) {
    if (error.constructor === HttpStatusError) {
      throw error
    }

    throw new Error('internal validation error', error)
  }
}

export default validateHandler
