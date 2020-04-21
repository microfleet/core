import {RequestMethods, TransportTypes, ReplyHeaders, ServiceRequestInterface, ReplyHeaderValue } from '../types'
import { ClientRequest } from 'http'
import noop = require('lodash/noop')
import { kReplyHeaders } from '../constants'

export const ServiceRequest = function(
  this: ServiceRequestInterface,
  transport: TransportTypes,
  method: RequestMethods,
  query: any,
  headers: any,
  params: any,
  transportRequest: any | ClientRequest,
  socket?: NodeJS.EventEmitter,
  parentSpan?: any,
) {
  this.transportRequest = transportRequest
  this.transport = transport
  this.method = method
  this.query = query
  this.params = params
  this.headers = headers
  this.socket = socket
  this.parentSpan = parentSpan

  // todo get rid of any
  this.log = console as any
  this.route = ''
  this.action = noop as any
  this.auth = Object.create(null)
  this.span = undefined
  this.locals = Object.create(null)
  this[kReplyHeaders] = new Map()
} as ServiceRequestInterface

ServiceRequest.prototype.getReplyHeader = function (title: string): ReplyHeaders {
  return this[kReplyHeaders].get(title.toLowerCase())
}

ServiceRequest.prototype.getReplyHeaders = function (): ReplyHeaders {
  return this[kReplyHeaders]
}

ServiceRequest.prototype.hasReplyHeader = function (title: string): boolean {
  return this[kReplyHeaders].has(title)
}

ServiceRequest.prototype.removeReplyHeader = function (title: string): ServiceRequestInterface {
  this[kReplyHeaders].delete(title)

  return this
}

ServiceRequest.prototype.setReplyHeader = function (title: string, value: ReplyHeaderValue): ServiceRequestInterface {
  this[kReplyHeaders].set(title.toLowerCase(), value)

  return this
}
