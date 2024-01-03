import type * as _ from '@microfleet/plugin-validator'
import type * as __ from '@microfleet/plugin-logger'
import { strict as assert } from 'assert'
import { resolve } from 'path'

import { NotImplementedError } from 'common-errors'
import { Server as SocketServer } from 'socket.io'
import { AdapterFactory } from 'ms-socket.io-adapter-amqp'

import { Microfleet } from '@microfleet/core'
import { RequestCountTracker, ActionTransport } from '@microfleet/plugin-router'
import { PluginTypes } from '@microfleet/utils'
import type { PluginInterface } from '@microfleet/core-types'

export type SocketIOAdapterConfig = {
  name: string
  options: any
}

export type SocketIOPluginConfig = {
  adapter?: SocketIOAdapterConfig
  socketioOptions: Required<ConstructorParameters<typeof SocketServer>>[1]
}

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
export const priority = 20

export const attach = async function attachSocketioPlugin(
  this: Microfleet,
  options: Partial<SocketIOPluginConfig> = {}
): Promise<PluginInterface> {
  assert(this.hasPlugin('validator'), 'validator module is required')

  // load local schemas
  await this.validator.addLocation(resolve(__dirname, '../schemas'))

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
    // @todo shouldn't be here
    getRequestCount: RequestCountTracker.getRequestCount.bind(undefined, this, ActionTransport.socketio),
  }
}
