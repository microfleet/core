import { noop } from 'lodash'
import { ActionTransport, BaseServiceRequest } from '@microfleet/plugin-router'

import type { ServiceRequest } from '@microfleet/plugin-router'

/**
 * @constructor
 */
export function AmqpServiceRequest(
  this: ServiceRequest,
  params: any,
  route: string,
  headers: any,
  transportRequest: any
) {
  BaseServiceRequest.call(
    this,
    route,
    noop as any, // action
    params,
    headers,
    Object.create(null), // query
    ActionTransport.amqp, // method
    ActionTransport.amqp, // transport
    transportRequest,
    Object.create(null), // locals
    null, // parentSpan
    null, // span
    console as any, // log
    true // reformatError
  )
  // ? do we need to preset auth
  this.auth = Object.create(null)
}
AmqpServiceRequest.prototype = Object.create(BaseServiceRequest.prototype)
AmqpServiceRequest.prototype.hasReplyHeadersSupport = function () {
  return true
}
AmqpServiceRequest.prototype.validateReplyHeader = function (key: string, value: string | Array<string>): ServiceRequest {
  if (Array.isArray(value)) {
    throw new Error('AMQP reply header value expected to be a string')
  }

  return this
}
