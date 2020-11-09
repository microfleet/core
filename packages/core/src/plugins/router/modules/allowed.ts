import Bluebird = require('bluebird')
import { identity } from '@microfleet/utils'
import { HttpStatusError, NotPermittedError } from 'common-errors'
import is = require('is')
import type { Microfleet, ServiceRequest } from '@microfleet/core-types'
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

function allowedHandler(this: Microfleet, request: ServiceRequest): Bluebird<any> {
  const allowedFn = is.undefined(request.action.allowed)
    ? identity
    : allowed

  return moduleLifecycle('allowed', allowedFn, this.router.extensions, [request], this)
}

export default allowedHandler
