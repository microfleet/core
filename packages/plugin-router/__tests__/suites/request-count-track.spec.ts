import { resolve } from 'path'
import { strict as assert } from 'assert'
import { spy } from 'sinon'
import * as SocketIOClient from 'socket.io-client'
import { Microfleet } from '@microfleet/core'
import { extensions } from '@microfleet/plugin-router'

import {
  getHTTPRequest,
  getSocketioRequest,
  verify
} from '../artifacts/utils'

const { auditLog } = extensions

describe('service request count', () => {
  it('counts requests on unknown routes', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: [
        'validator',
        'logger',
        'router',
        'http',
        'router-http',
        'socketio',
        'router-socketio',
      ],
      http: {
        server: {
          attachSocketio: true,
          port: 0,
        },
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
        },
        extensions: {
          register: [auditLog()]
        },
      },
      validator: { schemas: ['../artifacts/schemas'] },
    })

    await service.connect()
    const servicePort = service.http.info.port
    const serviceUrl = `http://0.0.0.0:${servicePort}`
    const { requestCountTracker } = service.router
    const preRequestSpy = spy(requestCountTracker, 'increase')
    const postResponseSpy = spy(requestCountTracker, 'decrease')

    const httpRequest = getHTTPRequest({ method: 'get', url: serviceUrl })
    const socketioClient = SocketIOClient(serviceUrl)
    const socketioRequest = getSocketioRequest(socketioClient)

    await httpRequest('/404').reflect()
    await socketioRequest('404', {}).reflect()

    assert(preRequestSpy.callCount === 2)
    assert(postResponseSpy.callCount === 2)

    socketioClient.close()
    await service.close()
  })

  it('counts requests on existing routes', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: [
        'validator',
        'logger',
        'router',
        'amqp',
        'router-amqp',
        'http',
        'router-http',
        'socketio',
        'router-socketio',
      ],
      'router-amqp': {
        prefix: 'amqp',
      },
      http: {
        server: {
          attachSocketio: true,
          port: 0,
        },
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
          prefix: 'action',
          enabledGenericActions: ['health'],
        },
        extensions: {
          register: [
            auditLog(),
          ],
        },
      },
      validator: { schemas: ['../artifacts/schemas'] },
    })

    await service.connect()

    const { amqp, http, router } = service
    const servicePort = http.info.port
    const serviceUrl = `http://0.0.0.0:${servicePort}`

    const { requestCountTracker } = router
    const preRequestSpy = spy(requestCountTracker, 'increase')
    const postResponseSpy = spy(requestCountTracker, 'decrease')

    const httpRequest = getHTTPRequest({ method: 'get', url: serviceUrl })
    const socketioClient = SocketIOClient(serviceUrl)
    const socketioRequest = getSocketioRequest(socketioClient)

    const returnsResult = {
      expect: 'success',
      verify: (result: any) => {
        assert(result.data.status === 'ok')
        assert(result.data.failed.length === 0)
      },
    }

    try {
      await Promise.all([
        amqp.publishAndWait('amqp.action.generic.health', {}).reflect().then(verify(returnsResult)),
        httpRequest('/action/generic/health').reflect().then(verify(returnsResult)),
        socketioRequest('action.generic.health', {}).reflect().then(verify(returnsResult)),
      ])
    } finally {
      socketioClient.close()
      await service.close()
    }

    assert(preRequestSpy.callCount === 3)
    assert(postResponseSpy.callCount === 3)
  })
})
