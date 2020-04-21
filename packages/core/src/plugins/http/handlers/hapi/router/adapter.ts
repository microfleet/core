import { HttpStatusError } from '@microfleet/validation'
import Bluebird = require('bluebird')
import Errors = require('common-errors')
import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi'
import { FORMAT_HTTP_HEADERS } from 'opentracing'
import { Microfleet, ReplyHeaderValue } from '../../../../..'
import _require from '../../../../../utils/require'
import { Router } from '../../../../router/factory'
import { createServiceRequest} from "./service-request-factory";

const setReplyHeader = (response: ResponseObject) => (value: ReplyHeaderValue, title: string) => {
  // set-cookie header exceptional case is correctly implemented by hapi
  return Array.isArray(value)
    ? value.forEach(item => response.header(title, item))
    : response.header(title, value)
}

export default function getHapiAdapter(actionName: string, service: Microfleet) {
  const Boom = _require('@hapi/boom')
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

  return async function handler(request: Request, h: ResponseToolkit) {
    const { headers } = request

    let parentSpan
    if (service.tracer !== undefined) {
      parentSpan = service.tracer.extract(headers, FORMAT_HTTP_HEADERS)
    }

    const serviceRequest = createServiceRequest(request, parentSpan);

    let response: ResponseObject

    try {
      const responseData = await dispatch(actionName, serviceRequest)

      response = h.response(responseData)
      serviceRequest.getReplyHeaders().forEach(setReplyHeader(response))
    } catch (e) {
      response = reformatError(e)
    }

    return response
  }
}
