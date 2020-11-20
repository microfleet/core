import { HttpStatusError } from '@microfleet/validation'
import { promisify } from 'bluebird'
import * as Errors from 'common-errors'
import { Request } from '@hapi/hapi'
import * as Boom from '@hapi/boom'
import { noop } from 'lodash'
import { FORMAT_HTTP_HEADERS } from 'opentracing'
import { Microfleet } from '@microfleet/core'
import { Router, ActionTransport, ServiceRequest } from '@microfleet/plugin-router'

export default function getHapiAdapter(actionName: string, service: Microfleet): (r: Request) => Promise<any> {
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

    // @todo fix types for boom payload
    const replyError = Boom.boomify(error, { statusCode, message: errorMessage }) as any

    if (error.name) {
      replyError.output.payload.name = error.name
    }

    return replyError
  }

  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const dispatch = promisify(router.dispatch, { context: router })

  return async function handler(request: Request) {
    // eslint-disable-next-line no-console
    console.log(actionName, request.payload)
    const { headers } = request

    let parentSpan
    if (service.tracer !== undefined) {
      parentSpan = service.tracer.extract(headers, FORMAT_HTTP_HEADERS)
    }

    const serviceRequest: ServiceRequest = {
      // defaults for consistent object map
      // opentracing
      // set to console
      // transport type
      headers,
      parentSpan,
      action: noop as any,
      locals: Object.create(null),
      log: console as any,
      method: request.method,
      params: request.payload,
      query: request.query,
      route: actionName,
      span: undefined,
      transport: ActionTransport.http,
      transportRequest: request,
    }

    let response
    try {
      response = await dispatch(actionName, serviceRequest)
    } catch (e) {
      response = reformatError(e)
    }

    return response
  }
}
