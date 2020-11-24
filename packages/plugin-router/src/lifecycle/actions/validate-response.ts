import { strict as assert } from 'assert'
import { Error } from 'common-errors'
import { Microfleet } from '@microfleet/core'
import { HttpStatusError } from '@microfleet/validation'

import { ServiceRequest } from '../../types/router'

export interface ValidateResponseConfig {
  enabled: boolean
  maxSample: number
  panic: boolean
}

export default async function validateResponseHandler(
  this: Microfleet,
  request: ServiceRequest,
  config?: ValidateResponseConfig
): Promise<void> {
  if (config === undefined) {
    return
  }

  const { enabled, maxSample, panic } = config
  if (enabled === false) {
    return
  }
  // @todo fast?
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
