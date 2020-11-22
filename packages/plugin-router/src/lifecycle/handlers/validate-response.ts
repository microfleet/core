import { strict as assert } from 'assert'
import { Microfleet } from '@microfleet/core'
import { HttpStatusError } from '@microfleet/validation'
import { Error } from 'common-errors'

import { RouterPluginConfig } from '../../types/plugin'
import { ServiceRequest } from '../../types/router'

export default async function validateResponseHandler(
  this: Microfleet,
  request: ServiceRequest,
  { routes: { responseValidation: responseValidationConfig } }: RouterPluginConfig
): Promise<void> {
  if (responseValidationConfig === undefined) {
    return
  }

  const { enabled, maxSample, panic } = responseValidationConfig

  if (enabled === false) {
    return
  }

  if (Math.round(Math.random() * 100) > maxSample) {
    return
  }

  const { validateResponse, responseSchema, actionName } = request.action

  if (validateResponse === false) {
    return
  }

  assert(responseSchema)

  try {
    await this.validator.validate(responseSchema, request.response)
  } catch (error: any) {
    if (panic) {
      if (error.constructor === HttpStatusError) {
        throw error
      }

      throw new Error('internal response validation error', error)
    }

    this.log.warn({ error, action: actionName }, '[response] validation failed')
  }
}
