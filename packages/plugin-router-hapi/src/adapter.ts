import type * as _ from '@microfleet/plugin-opentracing'
import Errors from 'common-errors'
import { FORMAT_HTTP_HEADERS } from 'opentracing'
import { Request, ResponseToolkit } from '@hapi/hapi'
import { boomify } from '@hapi/boom'

import { Microfleet } from '@microfleet/core'
import { HttpStatusError } from '@microfleet/validation'
import { HapiServiceRequest } from './service-request'
import { kReplyHeaders } from '@microfleet/plugin-router'
import type { SpanContext } from 'opentracing'
import type { ServiceRequest } from '@microfleet/plugin-router'

declare module '@hapi/boom' {
  interface Payload {
    name?: string
  }
}

function createServiceRequest(actionName: string, request: Request, parentSpan: SpanContext | null): ServiceRequest {
  const { payload, headers, query, method } = request
  return new (HapiServiceRequest as any)(actionName, payload, headers, query, method, request, parentSpan)
}

function resolveResponse(responseToolkit: ResponseToolkit, data: any, headers: any) {
  const response = responseToolkit.response(data)
  headers.forEach((value: string | Array<string>, key: string) => {
    if (Array.isArray(value)) {
      const options = key === 'set-cookie' ? { append: true } : {}
      value.forEach(item => response.header(key, item, options))
    } else {
      response.header(key, value)
    }
  })
  return response
}

export default function getHapiAdapter(actionName: string, service: Microfleet): (r: Request, h: ResponseToolkit) => Promise<any> {
  const { router } = service
  // pre-wrap the function so that we do not need to actually do fromNode(next)
  const reformatError = (error: any) => {
    let statusCode
    let errorMessage
    let headers

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

    // todo less ugly
    if (error[kReplyHeaders] instanceof Map) {
      headers = Object.fromEntries(error[kReplyHeaders])
    } else if (error.inner_error && error.inner_error[kReplyHeaders] instanceof Map) {
      headers = Object.fromEntries(error.inner_error[kReplyHeaders])
    }
    const replyError = boomify(error, { statusCode, message: errorMessage })

    if (error.name) {
      replyError.output.payload.name = error.name
    }

    if (headers) {
      replyError.output.headers = { ...replyError.output.headers, ...headers }
    }

    return replyError
  }

  return async function handler(request: Request, responseToolkit: ResponseToolkit) {
    const { headers } = request

    let parentSpan: SpanContext | null = null
    if (service.tracer !== undefined) {
      parentSpan = service.tracer.extract(FORMAT_HTTP_HEADERS, headers)
    }

    const serviceRequest = createServiceRequest(actionName, request, parentSpan)

    let response
    try {
      const data = await router.dispatch(serviceRequest)
      response = resolveResponse(responseToolkit, data, serviceRequest.getReplyHeaders())
    } catch (e: any) {
      response = reformatError(e)
    }

    return response
  }
}
