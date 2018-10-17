import { NotImplementedError } from 'common-errors'
import _debug = require('debug')
import is = require('is')
import { Microfleet, PluginTypes } from '../'
import _require from '../utils/require'
import attachRouter from './socketIO/router/attach'

const debug = _debug('mservice:socketIO')

interface AdaptersList {
  [name: string]: any
}

function attachSocketIO(this: Microfleet, config: any = {}) {
  debug('Attaching socketIO plugin')
  const service = this
  const AdapterFactory = _require('ms-socket.io-adapter-amqp')
  const SocketIO = _require('socket.io')

  const adapters: AdaptersList = {
    amqp: (adapterOptions: any) => AdapterFactory.fromOptions(adapterOptions),
  }

  if (is.fn(service.ifError)) {
    service.ifError('socketIO', config)
  }

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
}

export const attach = attachSocketIO
export const name = 'socketIO'
export const type = PluginTypes.transport
