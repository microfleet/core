import { Microfleet, ValidatorPlugin, ServiceRequest } from '@microfleet/core'
import { HttpStatusError } from '@microfleet/validation'
import { Error } from 'common-errors'

import { DATA_KEY_SELECTOR } from '../../types/router'

type ParamsKey = 'query' | 'params'

async function validateHandler(this: Microfleet & ValidatorPlugin, request: ServiceRequest): Promise<void> {
  const { validator } = this
  const { schema } = request.action

  // disable validation
  if (schema === null || schema === false) {
    return
  }

  const paramsKey: ParamsKey = DATA_KEY_SELECTOR[request.method]

  try {
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
