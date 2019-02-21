import { HttpStatusError } from '@microfleet/validation'
import Bluebird = require('bluebird')
import Errors = require('common-errors')
import { Request } from 'hapi'
import noop = require('lodash/noop')
import { ActionTransport, Microfleet } from '../../../../..'
import { ServiceRequest, RequestMethods } from '../../../../../types'
import _require from '../../../../../utils/require'
import { injectRequestHeaders, createChildSpan } from '../../../../../utils/opentracing'
import { Router } from '../../../../router/factory'

export default function getHapiAdapter(actionName: string, service: Microfleet) {
  const Boom = _require('boom')
  const router = service.router as Router

  const reformatError = (error: any) => {
    let statusCode
    let errorMessage

    const { errors } = error

    switch (error.constructor) {
      case Errors.AuthenticationRequiredError:
        statusCode = 401
        break

      case Errors.ValidationError:
        statusCode = 400
        break

      case Errors.NotPermittedError:
        statusCode = 403
        break

      case Errors.NotFoundError:
        statusCode = 404
        break

      default:
        statusCode = error.statusCode || 500
    }

    if (Array.isArray(errors) && errors.length > 0) {
      if (error.constructor === HttpStatusError) {
        errorMessage = error.message ? undefined : errors.map(e => `${e.field} ${e.message}`).join(';')
      } else {
        const [nestedError] = errors
        errorMessage = nestedError.text || nestedError.message || undefined
      }
    }

    const replyError = Boom.boomify(error, { statusCode, message: errorMessage })

    if (error.name) {
      replyError.output.payload.name = error.name
    }

    return replyError
  }

  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const dispatch = Bluebird.promisify(router.dispatch, { context: router })

  return async function handler(request: Request) {
    const { headers } = request

    const serviceRequest: ServiceRequest = {
      // defaults for consistent object map
      // opentracing
      // set to console
      // transport type
      headers,
      parentSpan: createChildSpan(service.tracer, headers),
      action: noop as any,
      locals: Object.create(null),
      log: console as any,
      method: request.method.toLowerCase() as RequestMethods,
      params: request.payload,
      query: request.query,
      route: '',
      span: undefined,
      transport: ActionTransport.http,
      transportRequest: request,
    }

    let response
    let outputHeaders
    try {
      response = await dispatch(actionName, serviceRequest)
      outputHeaders = response.headers
    } catch (e) {
      response = reformatError(e)
      outputHeaders = response.output.headers //
    }

    injectRequestHeaders(service.tracer, serviceRequest, outputHeaders)

    return response
  }
}
