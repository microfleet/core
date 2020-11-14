// @todo fix
import * as Bluebird from 'bluebird'
import { Inspection } from 'bluebird'
import { strict as assert } from 'assert'
import * as request from 'request-promise'
import { StatusCodeError } from 'request-promise/errors'

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
        assert.equal('success', caseOptions.expect)
        caseOptions.verify(inspection.value())
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(inspection.value())
        throw e;
      }
    }

    if (inspection.isRejected()) {
      try {
        assert.equal('error', caseOptions.expect)
        caseOptions.verify(inspection.reason())
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(inspection.reason())
        throw e
      }
    }
  }
}

export function getHTTPRequest(options: any) {
  return (action: string, params: any, opts = {}): Bluebird<any> => {
    const requestOptions = {
      baseUrl: options.url,
      method: 'POST',
      simple: true,
      ...options,
      ...opts,
      uri: action,
    };

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

export function getSocketioRequest(client: any) {
  return (action: string, params: any): Bluebird<any> =>
    Bluebird.fromCallback((callback) =>
      client.emit(action, params, callback));
}
