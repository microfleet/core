import assert = require('assert')
import { NotImplementedError, NotFoundError } from 'common-errors'
import _debug = require('debug')
import is = require('is')
import { ServerOptions } from 'socket.io'

import { ActionTransport, Microfleet, PluginTypes, ValidatorPlugin } from '../'
import _require from '../utils/require'
import attachRouter from './socketIO/router/attach'
import * as RequestTracker from './router/request-tracker'
import { SocketIOConfig } from './socketIO/types/socketIO'

const debug = _debug('mservice:socketIO')

interface AdaptersList {
  [name: string]: any;
}

interface RequestCounter {
  getRequestCount(): number
}

function attachSocketIO(this: Microfleet & ValidatorPlugin, opts: any = {}): RequestCounter {
  debug('Attaching socketIO plugin')
  const AdapterFactory = _require('ms-socket.io-adapter-amqp')
  const SocketIO = _require('socket.io')

  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  const adapters: AdaptersList = {
    amqp: (adapterOptions: any) => AdapterFactory.fromOptions(adapterOptions),
  }

  const config = this.validator.ifError('socketIO', opts) as SocketIOConfig
  const { options, router } = config
  const { adapter: adapterConfig } = options
  const socketIOServerOptions = { ...options, adapter: undefined } as ServerOptions

  if (is.object(adapterConfig)) {
    if (adapters[adapterConfig.name] === undefined) {
      throw new NotImplementedError(`Adapter ${adapterConfig.name} is not implemented`)
    }

    socketIOServerOptions.adapter = adapters[adapterConfig.name](adapterConfig.options)
  }

  const socketIO = SocketIO(socketIOServerOptions)

  if (router.enabled) {
    attachRouter(socketIO, router, this.router)
  }

  this.socketIO = socketIO

  return {
    getRequestCount: RequestTracker.getRequestCount.bind(undefined, this, ActionTransport.socketIO),
  }
}
/**
 * Relative priority inside the same plugin group type
 */
export const priority = 100
export const attach = attachSocketIO
export const name = 'socketIO'
export const type = PluginTypes.transport
