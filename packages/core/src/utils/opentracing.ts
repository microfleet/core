import { ServiceRequest } from '../types'
import { FORMAT_HTTP_HEADERS } from 'opentracing'

// inject span headers to the response so trace wouldn't be lost
export function injectRequestHeaders(tracer: any, serviceRequest: ServiceRequest, responseHeadersObj: Object) {
  const { span } = serviceRequest
  if (tracer !== undefined && span !== undefined) {
    tracer.inject(span.context(), FORMAT_HTTP_HEADERS, responseHeadersObj)
  }
}

// create span context based on request headers
export function createChildSpan(tracer: any, headers: Object) {
  if (tracer === undefined) {
    return undefined
  }
  return tracer.extract(FORMAT_HTTP_HEADERS, headers)
}
