import { strictEqual } from 'assert'
import { resolve } from 'path'
import { NotImplementedError, NotFoundError } from 'common-errors'
import createDebug from 'debug'
import * as SocketIOStatic from 'socket.io'
import { PluginTypes, Microfleet, ValidatorPlugin } from '@microfleet/core'
import { LoggerPlugin } from '@microfleet/plugin-logger'
// @todo shouldn't be here
import { RequestCountTracker, ActionTransport } from '@microfleet/plugin-router'
// @todo peer dependency
import AdapterFactory from 'ms-socket.io-adapter-amqp'

import { SocketIOPlugin, SocketIOPluginConfig, RequestCounter } from './types/plugin'

const debug = createDebug('@microfleet/plugin-socketio')

export const name = 'socketio'
export const type = PluginTypes.transport
export const priority = 0

export const attach = function attachSocketioPlugin(
  this: Microfleet & ValidatorPlugin & LoggerPlugin & SocketIOPlugin,
  options: Partial<SocketIOPluginConfig> = {}
): RequestCounter {
  debug('Attaching socketIO plugin')
  strictEqual(this.hasPlugin('validator'), true, new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  // validate
  const config = this.validator.ifError('socketio', options) as SocketIOPluginConfig

  const { adapter: adapterConfig, socketioOptions } = config
  const socketioServerOptions = { ...socketioOptions }

  if (adapterConfig !== undefined && socketioOptions.adapter !== undefined) {
    this.log.warn('Ignoring adapter from socket.io options')
  }

  // setup socket.io adapter
  if (adapterConfig !== undefined) {
    if (adapterConfig.name === 'amqp') {
      socketioServerOptions.adapter = AdapterFactory.fromOptions(adapterConfig.options) as SocketIOStatic.Adapter
    } else {
      throw new NotImplementedError(`Socket.io adapter "${adapterConfig.name}" is not implemented`)
    }
  }

  this.socketio = new SocketIOStatic(socketioServerOptions)

  return {
    // @todo shouldn't be here
    getRequestCount: RequestCountTracker.getRequestCount.bind(undefined, this, ActionTransport.socketio),
  }
}
