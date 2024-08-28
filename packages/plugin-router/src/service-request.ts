import { ActionTransport } from './router'
import { kReplyHeaders } from './symbols'

import type { ClientRequest } from 'http'
import type { Span, SpanContext } from 'opentracing'
import type { Logger } from '@microfleet/plugin-logger'
import type { ServiceAction, ServiceRequest } from './types/router'
import type { RequestDataKey } from './router'

/**
 * @constructor
 */
export function BaseServiceRequest<R=unknown>(
  this: ServiceRequest,
  route: string,
  action: ServiceAction<R>,
  params: any,
  headers: any,
  query: any,
  method: keyof typeof RequestDataKey,
  transport: typeof ActionTransport[keyof typeof ActionTransport],
  transportRequest: any | ClientRequest,
  locals: any,
  parentSpan: SpanContext | null,
  span: Span | null,
  log: Logger,
  reformatError: boolean
) {
  this.route = route
  this.action = action
  this.params = params
  this.headers = headers
  this.query = query
  this.method = method
  this.transport = transport
  this.transportRequest = transportRequest
  this.locals = locals
  this.parentSpan = parentSpan
  this.span = span
  this.log = log
  this.reformatError = reformatError
  this.response = undefined
  this.error = undefined
  this[kReplyHeaders] = new Map()
}

BaseServiceRequest.prototype.hasReplyHeadersSupport = function () {
  throw new Error('Method must be implemented in inherited prototype')
}

BaseServiceRequest.prototype.getReplyHeaders = function () {
  return this[kReplyHeaders]
}

BaseServiceRequest.prototype.getReplyHeader = function (key: string): any | undefined {
  return this[kReplyHeaders].get(key.toLowerCase())
}

BaseServiceRequest.prototype.hasReplyHeader = function (key: string): boolean {
  return this[kReplyHeaders].has(key.toLowerCase())
}
BaseServiceRequest.prototype.removeReplyHeader = function (key: string): ServiceRequest {
  delete this[kReplyHeaders].delete(key.toLowerCase())

  return this
}

BaseServiceRequest.prototype.setReplyHeader = function (key: string, value: string | Array<string>): ServiceRequest {
  this.validateReplyHeader(key, value)

  this[kReplyHeaders].set(key.toLowerCase(), value)

  return this
}
BaseServiceRequest.prototype.clearReplyHeaders = function () {
  return this[kReplyHeaders].clear()
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
BaseServiceRequest.prototype.validateReplyHeader = function (_key: string, _value: string | Array<string>): ServiceRequest {
  throw new Error('Method must be implemented in inherited prototype')
}

/**
 * @constructor
 */
export function InternalServiceRequest(
  this: ServiceRequest,
  params: any,
  headers: any,
  transportRequest: any | ClientRequest,
  locals: any
) {
  BaseServiceRequest.call(
    this,
    '', // route
    null as any, // action
    params,
    headers,
    Object.create(null), // query
    ActionTransport.internal, // method
    ActionTransport.internal, // transport
    transportRequest, // transportRequest
    locals,
    null, // parentSpan
    null, // span
    console as any, // log
    false // reformatError
  )
  this.auth = Object.create(null)
}
InternalServiceRequest.prototype = Object.create(BaseServiceRequest.prototype)
InternalServiceRequest.prototype.hasReplyHeadersSupport = function () {
  return true
}
InternalServiceRequest.prototype.validateReplyHeader = function (_key: string, _value: string | Array<string>): ServiceRequest {
  return this
}

