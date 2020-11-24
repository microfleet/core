import { strict as assert } from 'assert'
import { resolve } from 'path'
// @todo how to fix double import?
import * as Bluebird from 'bluebird'
import { Inspection } from 'bluebird'
import * as request from 'request-promise'
import { StatusCodeError } from 'request-promise/errors'
import { defaultsDeep } from 'lodash'
import { Socket } from 'socket.io-client'
import { OptionsWithUrl } from 'request-promise'

export type Case = {
  expect: string
  verify(params: any): void
}
export type CaseInspection = Inspection<Promise<any>>

// @todo refactor
export function verify(caseOptions: Case): (inspection: CaseInspection) => void {
  return (inspection: CaseInspection): void => {
    assert(inspection.isFulfilled() || inspection.isRejected(), 'promise is pending')

    if (inspection.isFulfilled()) {
      try {
        caseOptions.verify(inspection.value())
        assert.equal('success', caseOptions.expect)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(inspection.value())
        throw e
      }
    }

    if (inspection.isRejected()) {
      try {
        caseOptions.verify(inspection.reason())
        assert.equal('error', caseOptions.expect)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(inspection.reason())
        throw e
      }
    }
  }
}

export function getHTTPRequest(options: OptionsWithUrl): (action: string, params?: any, opts?: any) => Bluebird<any> {
  return (action: string, params?: any, opts: any = {}): Bluebird<any> => {
    const requestOptions = {
      baseUrl: options.url,
      method: 'POST',
      simple: true,
      ...options,
      ...opts,
      uri: action,
    }

    // patch
    delete requestOptions.url

    if (params) {
      requestOptions.json = params
    } else {
      requestOptions.json = true
    }

    return request(requestOptions)
      .promise()
      .catch(StatusCodeError, (err: any) => Bluebird.reject(err.response.body))
  }
}

export function getSocketioRequest(client: Socket): (action: string, params: any) => Bluebird<any> {
  return (action: string, params: any): Bluebird<any> =>
    Bluebird.fromCallback((callback) =>
      client.emit(action, params, callback))
}

export function withResponseValidateAction(name: string, extra: any = {}): any {
  const config = {
    name,
    plugins: [
      'validator',
      'logger',
      'amqp',
      'http',
      'socketio',
      'router',
      'router-amqp',
      'router-http',
      'router-socketio',
    ],
    http: {
      server: {
        attachSocketio: true,
      },
    },
    router: {
      routes: {
        directory: resolve(__dirname, './actions'),
        prefix: 'action',
      },
    },
    validator: { schemas: [resolve(__dirname, './schemas')] },
  }

  return defaultsDeep(config, extra)
}
