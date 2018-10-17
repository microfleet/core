import Bluebird = require('bluebird')
import { ArgumentError, HttpStatusError, NotPermittedError } from 'common-errors'
import is = require('is')
import { Microfleet } from '../../../'
import { ServiceRequest } from '../../../types'
import moduleLifecycle from './lifecycle'

function allowed(this: Microfleet, request: ServiceRequest) {
  return Bluebird
    .resolve(request)
    .bind(this)
    .then(request.action.allowed)
    .return(request)
    .catch((error) => {
      switch (error.constructor) {
        case NotPermittedError:
        case HttpStatusError:
          return Bluebird.reject(error)

        default:
          return Bluebird.reject(new NotPermittedError(error))
      }
    })
}

function allowedHandler(this: Microfleet, request: ServiceRequest) {
  if (request.action === undefined) {
    return Bluebird.reject(new ArgumentError('"request" must have property "action"'))
  }

  if (is.undefined(request.action.allowed)) {
    return Bluebird.resolve(request)
  }

  return moduleLifecycle('allowed', allowed, this.router.extensions, [request], this)
}

export default allowedHandler
