import { noop } from 'lodash'
import { ActionTransport, BaseServiceRequest } from '@microfleet/plugin-router'
import { kReplyHeaders } from '@microfleet/plugin-router'
import type { ClientRequest } from 'http'
import type { SpanContext } from 'opentracing'
import type { ServiceRequest } from '@microfleet/plugin-router'
import type { RequestDataKey } from '@microfleet/plugin-router/src/router'

export function HapiServiceRequest(
  this: ServiceRequest,
  route: string,
  params: any,
  headers: any,
  query: any,
  method: keyof typeof RequestDataKey,
  transportRequest: ClientRequest,
  parentSpan: SpanContext | null,
) {
  BaseServiceRequest.call(
    this,
    route,
    noop as any,
    params,
    headers,
    query,
    method,
    ActionTransport.http,
    transportRequest,
    Object.create(null), // locals
    parentSpan,
    null, // span
    console as any,
    true // reformatError
  )
}
HapiServiceRequest.prototype = Object.create(BaseServiceRequest.prototype)
HapiServiceRequest.prototype.hasReplyHeadersSupport = function () {
  return true
}
HapiServiceRequest.prototype.setReplyHeader = function (key: string, value: string | Array<string>): ServiceRequest {
  const lcKey = key.toLowerCase()
  let normalizedValue

  if (lcKey === 'set-cookie') {
    if (!this[kReplyHeaders].get(lcKey)) {
      this[kReplyHeaders].set(lcKey, [])
    }
    normalizedValue = Array.isArray(value)
      ? [...this[kReplyHeaders].get(lcKey), ...value]
      : [...this[kReplyHeaders].get(lcKey), value]
  } else {
    normalizedValue = value
  }
  BaseServiceRequest.prototype.setReplyHeader.call(this, lcKey, normalizedValue)

  return this
}
HapiServiceRequest.prototype.validateReplyHeader = function () {
  return this
}

