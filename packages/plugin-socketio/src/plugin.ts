/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-logger'
/* eslint-enable @typescript-eslint/no-unused-vars */
import type { PluginInterface } from '@microfleet/core-types'

import { strictEqual } from 'assert'
import { resolve } from 'path'
import { NotImplementedError, NotFoundError } from 'common-errors'
import createDebug from 'debug'
import { Server as SocketServer } from 'socket.io'
import { ActionTransport, Microfleet } from '@microfleet/core'
import { PluginTypes } from '@microfleet/utils'
import { AdapterFactory } from 'ms-socket.io-adapter-amqp'
import { getRequestCount } from '@microfleet/core/lib/plugins/router/request-tracker'

export type SocketIOAdapterConfig = {
  name: string;
  options: any;
}

export type SocketIOPluginConfig = {
  adapter?: SocketIOAdapterConfig;
  socketioOptions: Required<ConstructorParameters<typeof SocketServer>>[1];
}

const debug = createDebug('mservice:socketIO')

declare module '@microfleet/core-types' {
  interface Microfleet {
    socketio: SocketServer
  }

  interface ConfigurationOptional {
    socketio: SocketIOPluginConfig
  }
}

export const name = 'socketio'
export const type = PluginTypes.transport
export const priority = 100

export const attach = function attachSocketioPlugin(
  this: Microfleet,
  options: Partial<SocketIOPluginConfig> = {}
): PluginInterface {
  debug('Attaching socketIO plugin')
  strictEqual(this.hasPlugin('validator'), true, new NotFoundError('validator module must be included'))

  // load local schemas
  this.validator.addLocation(resolve(__dirname, '../schemas'))

  // validate
  const config = this.validator.ifError<SocketIOPluginConfig>('socketio', options)

  const { adapter: adapterConfig, socketioOptions } = config
  const socketioServerOptions = { ...socketioOptions }

  if (adapterConfig !== undefined && socketioOptions.adapter !== undefined) {
    this.log.warn('Ignoring adapter from socket.io options')
  }

  // setup socket.io adapter
  if (adapterConfig !== undefined) {
    if (adapterConfig.name === 'amqp') {
      socketioServerOptions.adapter = AdapterFactory.fromOptions(adapterConfig.options)
    } else {
      throw new NotImplementedError(`Socket.io adapter "${adapterConfig.name}" is not implemented`)
    }
  }

  this.socketio = new SocketServer(socketioServerOptions)

  return {
    getRequestCount: getRequestCount.bind(undefined, this, ActionTransport.socketio),
  }
}
