import { MSError } from '@microfleet/transport-amqp/lib/utils/serialization'
import { HttpStatusError as HttpError } from '@microfleet/validation'
import { boomify } from '@hapi/boom'
import Bluebird = require('bluebird')
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
import { Microfleet } from '../../../'
import { ServiceRequestInterface } from '../../../types'
import moduleLifecycle from './lifecycle'

function response(this: Microfleet, err: Error | null, result: any) {
  if (err) {
    switch (err.constructor) {
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
        return Bluebird.reject(err)
    }

    if (err.constructor === MSError) {
      switch (err.name) {
        case 'AuthenticationRequiredError':
        case 'ConnectionError':
        case 'HttpStatusError':
        case 'NotImplementedError':
        case 'NotFoundError':
        case 'NotPermittedError':
        case 'NotSupportedError':
        case 'TimeoutError':
        case 'ValidationError':
          return Bluebird.reject(err)
      }
    }

    this.log.fatal({ err: boomify(err) }, 'unexpected error')
    return Bluebird.reject(new CError(`Something went wrong: ${err.message}`, err))
  }

  return Bluebird.resolve(result)
}

function responseHandler(this: Microfleet, params: [Error | null, any, ServiceRequestInterface]) {
  return moduleLifecycle('response', response, this.router.extensions, params, this)
}

export default responseHandler
