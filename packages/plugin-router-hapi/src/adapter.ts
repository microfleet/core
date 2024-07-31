import type * as _ from '@microfleet/plugin-opentracing'
import Errors from 'common-errors'
import { noop } from 'lodash'
import { FORMAT_HTTP_HEADERS, SpanContext } from 'opentracing'
import { Request } from '@hapi/hapi'
import { boomify } from '@hapi/boom'

import { Microfleet } from '@microfleet/core'
import { ActionTransport, ServiceRequest } from '@microfleet/plugin-router'
import { HttpStatusError } from '@microfleet/validation'

declare module '@hapi/boom' {
  interface Payload {
    name?: string
  }
}

export default function getHapiAdapter(actionName: string, service: Microfleet): (r: Request) => Promise<any> {
  const { router } = service
  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const reformatError = (error: any) => {
    let statusCode
    let errorMessage
    let code = undefined

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
        code = nestedError.code || undefined
      }
    }

    const replyError = boomify(error, { statusCode, message: errorMessage, data: { code } })

    if (error.name) {
      replyError.output.payload.name = error.name
    }

    return replyError
  }

  return async function handler(request: Request) {
    const { headers } = request

    let parentSpan: SpanContext | null = null
    if (service.tracer !== undefined) {
      parentSpan = service.tracer.extract(FORMAT_HTTP_HEADERS, headers)
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
      span: null,
      transport: ActionTransport.http,
      transportRequest: request,
      reformatError: true,
    }

    let response
    try {
      response = await router.dispatch(serviceRequest)
    } catch (e: any) {
      response = reformatError(e)
    }

    return response
  }
}
