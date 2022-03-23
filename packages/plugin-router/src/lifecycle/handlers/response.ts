import { MSError } from '@microfleet/transport-amqp/lib/utils/serialization'
import { Microfleet } from '@microfleet/core'
import { HttpStatusError as HttpError } from '@microfleet/validation'
import { boomify } from '@hapi/boom'
import {
  AuthenticationRequiredError,
  ConnectionError,
  Error as CError,
  HttpStatusError,
  NotFoundError,
  NotImplementedError,
  NotPermittedError,
  NotSupportedError,
  TimeoutError,
  ValidationError
} from 'common-errors'

import { ServiceRequest } from '../../types/router'

export default async function responseHandler(this: Microfleet, request: ServiceRequest): Promise<void> {
  const { error, reformatError } = request

  if (error !== undefined) {
    if (reformatError === true) {
      switch (error.constructor) {
        case AuthenticationRequiredError:
        case ConnectionError:
        case HttpStatusError:
        case HttpError:
        case NotImplementedError:
        case NotFoundError:
        case NotPermittedError:
        case NotSupportedError:
        case TimeoutError:
        case ValidationError:
        case CError:
          throw error
      }

      if (error.constructor === MSError) {
        switch (error.name) {
          case 'AuthenticationRequiredError':
          case 'ConnectionError':
          case 'HttpStatusError':
          case 'NotImplementedError':
          case 'NotFoundError':
          case 'NotPermittedError':
          case 'NotSupportedError':
          case 'TimeoutError':
          case 'ValidationError':
            throw error
        }
      }

      this.log.fatal({ err: boomify(error) }, 'unexpected error')

      throw new CError(`Something went wrong: ${error.message}`, error)
    }

    throw error
  }
}
