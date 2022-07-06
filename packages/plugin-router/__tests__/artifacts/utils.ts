import { strict as assert } from 'assert'
import { resolve } from 'path'
import Bluebird from 'bluebird'
import { mergeDeep } from '@microfleet/utils'
import { Socket, io } from 'socket.io-client'
import { once } from 'events'
import hyperid from 'hyperid'
import { CoreOptions } from '@microfleet/core'
import undici, { RequestInit } from 'undici'

const idInstance = hyperid({ urlSafe: true })

export type Case = {
  expect: string
  verify(params: any): void
}
export type CaseInspection<T = unknown> = Bluebird.Inspection<T>

// @todo refactor
export function verify(caseOptions: Case): (inspection: CaseInspection) => void {
  return (inspection: CaseInspection): void => {
    assert(inspection.isFulfilled() || inspection.isRejected(), 'promise is pending')

    if (inspection.isFulfilled()) {
      try {
        caseOptions.verify(inspection.value())
        assert.equal('success', caseOptions.expect)
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.warn(inspection.value())
        throw e
      }
    }

    if (inspection.isRejected()) {
      try {
        caseOptions.verify(inspection.reason())
        assert.equal('error', caseOptions.expect)
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.warn(inspection.reason())
        throw e
      }
    }
  }
}

export function getHTTPRequest<T = any>(_options: RequestInit & {url: string }): (action: string, params?: any, opts?: any) => Bluebird<T> {
  return (action: string, params?: any, opts: any = {}): Bluebird<T> => {
    const { url, ...options } = _options
    const requestOptions = {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      ...options,
    }

    const reqUrl = new URL(`${url}${action}`)

    requestOptions.body = params || opts.json ? JSON.stringify(opts.json || params) : null
    reqUrl.search = opts.qs && new URLSearchParams(opts.qs).toString()

    return Bluebird.method<T>(async () => {
      const response = await undici.fetch(reqUrl.toString(), requestOptions)
      if (response.status !== 200) {
        throw await response.json()
      }

      return response.json() as any as T
    })()
  }
}

export const getIOClient = async (host: string): Promise<Socket> => {
  const socket = io(host, {
    forceNew: true,
    autoConnect: false,
    transports: ['websocket'],
    timeout: 1000,
    reconnection: false,
  })

  socket.connect()
  await once(socket, 'connect')

  return socket
}

export function getSocketioRequest(client: Socket, { ignoreDisconnect = false } = {}): (action: string, params: any) => Bluebird<any> {
  return (action: string, params: any): Bluebird<any> => {
    return Bluebird.fromCallback((callback) => {
      if (client.disconnected) {
        if (ignoreDisconnect) {
          return callback(null, ignoreDisconnect)
        }

        return callback(new Error('client disconnected'))
      }

      client.emit(action, params, callback)
    })
  }
}

export function getAmqpRequest(amqp: any) {
  return (path: string, params: unknown) => Bluebird.resolve(amqp.publishAndWait(path, params))
}

export function withResponseValidateAction(name: string, extra: Partial<CoreOptions> = {}): any {
  const config: Partial<CoreOptions> = {
    name,
    plugins: [
      'validator',
      'logger',
      'amqp',
      'hapi',
      'socketio',
      'router',
      'router-amqp',
      'router-hapi',
      'router-socketio',
    ],
    amqp: {
      transport: {
        exchange: `test-${idInstance()}`
      }
    },
    logger: {
      defaultLogger: false,
    },
    hapi: {
      attachSocketio: true,
    },
    router: {
      routes: {
        directory: resolve(__dirname, './actions'),
        prefix: 'action',
      },
    },
    validator: { schemas: [resolve(__dirname, './schemas')] },
  }

  return mergeDeep(config, extra)
}
