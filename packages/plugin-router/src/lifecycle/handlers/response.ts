// @todo remove @microfleet/transport-amqp as dependency
import { MSError } from '@microfleet/transport-amqp/lib/utils/serialization'
import { Microfleet, ServiceRequest } from '@microfleet/core'
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

export default async function responseHandler(this: Microfleet, request: ServiceRequest): Promise<any> {
  const { error } = request

  if (error) {
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
}
