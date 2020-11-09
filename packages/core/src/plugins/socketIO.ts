import assert = require('assert')
import { NotImplementedError, NotFoundError } from 'common-errors'
import _debug = require('debug')
import is = require('is')
import type { Microfleet } from '@microfleet/core-types'
import { ActionTransport, PluginTypes } from '@microfleet/utils'
import attachRouter from './socketIO/router/attach'
import * as RequestTracker from './router/request-tracker'
import { Server as SocketIO } from 'socket.io'
import { AdapterFactory } from 'ms-socket.io-adapter-amqp'

const debug = _debug('mservice:socketIO')

interface AdaptersList {
  [name: string]: any;
}

interface RequestCounter {
  getRequestCount(): number
}

function attachSocketIO(this: Microfleet, opts: any = {}): RequestCounter {
  debug('Attaching socketIO plugin')
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

  const socketIO = new SocketIO(options)

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
