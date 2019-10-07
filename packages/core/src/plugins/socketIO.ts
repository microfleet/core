import assert = require('assert')
import { NotImplementedError, NotFoundError } from 'common-errors'
import _debug = require('debug')
import is = require('is')
import { ActionTransport, Microfleet, PluginTypes } from '../'
import _require from '../utils/require'
import attachRouter from './socketIO/router/attach'
import * as RequestTracker from './router/requestTracker'

const debug = _debug('mservice:socketIO')

interface AdaptersList {
  [name: string]: any
}

function attachSocketIO(this: Microfleet, opts: any = {}) {
  debug('Attaching socketIO plugin')
  const service = this
  const AdapterFactory = _require('ms-socket.io-adapter-amqp')
  const SocketIO = _require('socket.io')

  assert(service.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  const adapters: AdaptersList = {
    amqp: (adapterOptions: any) => AdapterFactory.fromOptions(adapterOptions),
  }

  const config = service.ifError('socketIO', opts)
  const { options, router } = config
  const { adapter } = options

  if (is.object(adapter)) {
    if (adapters[adapter.name] === undefined) {
      throw new NotImplementedError(`Adapter ${adapter.name} is not implemented`)
    }

    options.adapter = adapters[adapter.name](adapter.options)
  }

  const socketIO = SocketIO(options)

  if (router.enabled) {
    attachRouter(socketIO, router, service.router)
  }

  this.socketIO = socketIO

  return {
    getRequestCount: () => RequestTracker.getRequestCount(service, ActionTransport.socketIO),
  }
}
/**
 * Relative priority inside the same plugin group type
 */
export const priority = 100
export const attach = attachSocketIO
export const name = 'socketIO'
export const type = PluginTypes.transport
