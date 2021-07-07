import { Microfleet } from '@microfleet/core'
import { HttpStatusError, NotPermittedError } from 'common-errors'

import { ServiceRequest } from '../../types/router'

async function allowedHandler(this: Microfleet, request: ServiceRequest): Promise<void> {
  const { allowed } = request.action

  if (allowed === undefined) {
    return
  }

  try {
    await allowed.call(this, request)
  } catch (error: any) {
    switch (error.constructor) {
      case NotPermittedError:
      case HttpStatusError:
        throw error

      default:
        throw new NotPermittedError(error)
    }
  }
}

export default allowedHandler
