import _debug = require('debug')
import { ActionTransport, ServiceRequestInterface } from '../../..'
import { Router } from '../../router/factory'
import { RequestCallback } from '../../router/dispatcher'
import { createServiceRequest } from './service-request-factory'

const debug = _debug('mservice:router:socket.io')
const { socketIO } = ActionTransport

export interface SocketIOMessageOptions {
  simpleResponse?: boolean;
}

export interface SocketIOMessage {
  data: [string, any, SocketIOMessageOptions, RequestCallback];
}

function wrapCallback(
  router: Router,
  serviceRequest: ServiceRequestInterface,
  options: SocketIOMessageOptions,
  callback: RequestCallback
) {
  return (err: any, result?: any) => {
    // Decrease request count on response
    router.requestCountTracker.decrease(socketIO)

    if (!callback) return

    const response = options && options.simpleResponse === false
      ? { headers: Object.fromEntries(serviceRequest.getReplyHeaders()), data: result }
      : result

    callback(err, response)
  }
}

function getSocketIORouterAdapter(_: any, router: Router) {
  return function socketIORouterAdapter(socket: NodeJS.EventEmitter) {
    socket.on('*', (packet: SocketIOMessage) => {
      /* Increase request count on message */
      router.requestCountTracker.increase(socketIO)

      const [actionName, params, options, callback] = packet.data
      const serviceRequest = createServiceRequest(params, packet, socket)

      debug('prepared request with', packet.data)
      const wrappedCallback = wrapCallback(router, serviceRequest, options, callback)
      router.dispatch.call(router, actionName, serviceRequest, wrappedCallback)
    })
  }
}

export default getSocketIORouterAdapter
