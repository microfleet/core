import { noop } from 'lodash'
import {ActionTransport, BaseServiceRequest, kReplyHeaders} from '@microfleet/plugin-router'

import type { Socket } from 'socket.io'
import type { ServiceRequest } from '@microfleet/plugin-router'

const NoReplyHeadersSupportError = new Error('Websocket events do not support headers')

/**
 * @constructor
 */
export function SocketIoServiceRequest(
  this: ServiceRequest,
  route: string,
  params: any,
  transportRequest: any,
  socket: Socket
) {
  BaseServiceRequest.call(
    this,
    route,
    noop as any, // action
    params,
    Object.create(null), // headers
    Object.create(null), // query
    ActionTransport.socketio, // transport
    ActionTransport.socketio, // method
    transportRequest,
    Object.create(null), // locals
    null, // parentSpan
    null, // span
    console as any, // log
    true // reformatError
  )
  this.socket = socket
}
SocketIoServiceRequest.prototype = Object.create(BaseServiceRequest.prototype)

SocketIoServiceRequest.prototype.hasReplyHeadersSupport = function () {
  return false
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
SocketIoServiceRequest.prototype.getReplyHeaders = function () {
  throw NoReplyHeadersSupportError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
SocketIoServiceRequest.prototype.getReplyHeader = function (_key: string): any | undefined {
  throw NoReplyHeadersSupportError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
SocketIoServiceRequest.prototype.hasReplyHeader = function (_key: string): boolean {
  throw NoReplyHeadersSupportError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
SocketIoServiceRequest.prototype.removeReplyHeader = function (_key: string): ServiceRequest {
  throw NoReplyHeadersSupportError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
SocketIoServiceRequest.prototype.setReplyHeader = function (_key: string, _value: string | Array<string>): ServiceRequest {
  throw NoReplyHeadersSupportError
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
SocketIoServiceRequest.prototype.validateReplyHeader = function (_key: string, _value: string | Array<string>): ServiceRequest {
  throw NoReplyHeadersSupportError
}

SocketIoServiceRequest.prototype.clearReplyHeaders = function () {
  throw NoReplyHeadersSupportError
}
