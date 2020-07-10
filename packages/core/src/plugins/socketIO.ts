import assert = require('assert')
import { NotImplementedError, NotFoundError } from 'common-errors'
import _debug = require('debug')
import is = require('is')
import { ActionTransport, Microfleet, PluginTypes, ValidatorPlugin } from '../'
import _require from '../utils/require'
import attachRouter from './socketIO/router/attach'
import * as RequestTracker from './router/request-tracker'

const debug = _debug('mservice:socketIO')

interface AdaptersList {
  [name: string]: any;
}

interface RequestCounter {
  getRequestCount(): number
}

function attachSocketIO(this: Microfleet & ValidatorPlugin, opts: any = {}): RequestCounter {
  debug('Attaching socketIO plugin')
  const AdapterFactory = _require('ms-socket.io-adapter-amqp').AdapterFactory
  const SocketIO = _require('socket.io')

  assert(this.hasPlugin('validator'), new NotFoundError('validator module must be included'))

  const adapters: AdaptersList = {
    amqp: (adapterOptions: any) => AdapterFactory.fromOptions(adapterOptions),
  }

  const config = this.validator.ifError('socketIO', opts)
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
