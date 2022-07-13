import { strict as assert } from 'assert'
import { spy } from 'sinon'
import { Microfleet } from '@microfleet/core'
import { Extensions } from '@microfleet/plugin-router'

import {
  getAmqpRequest,
  getHTTPRequest,
  getSocketioRequest,
  verify,
  getIOClient,
  withResponseValidateAction,
} from '../artifacts/utils'
import getFreePort from 'get-port'
import { getGlobalDispatcher } from 'undici'

const { auditLog } = Extensions

describe('service request count', () => {
  it('counts requests on unknown routes', async () => {
    const port = await getFreePort()
    const service = new Microfleet(withResponseValidateAction('tester', {
      plugins: [
        'validator',
        'logger',
        'hapi',
        'socketio',
        'router',
        'router-hapi',
        'router-socketio',
      ],
      hapi: { server: { port } },
      router: {
        routes: { prefix: '' },
        extensions: { register: [auditLog()] },
      },
    }))

    await service.connect()

    const serviceUrl = `http://0.0.0.0:${port}`
    const { requestCountTracker } = service.router
    const preRequestSpy = spy(requestCountTracker, 'increase')
    const postResponseSpy = spy(requestCountTracker, 'decrease')

    const httpRequest = getHTTPRequest({ method: 'get', url: serviceUrl })
    const socketioClient = await getIOClient(serviceUrl)
    const socketioRequest = getSocketioRequest(socketioClient)

    await httpRequest('/404').reflect()
    await socketioRequest('/404', {}).reflect()

    assert(preRequestSpy.callCount === 2)
    assert(postResponseSpy.callCount === 2)

    socketioClient.close()
    await service.close()
  })

  it('counts requests on existing routes', async () => {
    const port = await getFreePort()
    const service = new Microfleet(withResponseValidateAction('tester', {
      routerAmqp: {
        prefix: 'amqp',
      },
      hapi: { server: { port } },
      router: {
        routes: {
          enabledGenericActions: ['health'],
        },
        extensions: { register: [auditLog()] },
      },
    }))

    await service.connect()

    const { amqp, router } = service
    const serviceUrl = `http://0.0.0.0:${port}`

    const { requestCountTracker } = router
    const preRequestSpy = spy(requestCountTracker, 'increase')
    const postResponseSpy = spy(requestCountTracker, 'decrease')

    const httpRequest = getHTTPRequest({ method: 'get', url: serviceUrl })
    const socketioClient = await getIOClient(serviceUrl)
    const socketioRequest = getSocketioRequest(socketioClient)
    const amqpRequest = getAmqpRequest(amqp)

    const returnsResult = {
      expect: 'success',
      verify: (result: any) => {
        assert(result.data.status === 'ok')
        assert(result.data.failed.length === 0)
      },
    }

    await Promise.all([
      amqpRequest('amqp.action.generic.health', {}).reflect().then(verify(returnsResult)),
      httpRequest('/action/generic/health').reflect().then(verify(returnsResult)),
      socketioRequest('action.generic.health', {}).reflect().then(verify(returnsResult)),
    ])

    socketioClient.close()
    await service.close()

    assert(preRequestSpy.callCount === 3)
    assert(postResponseSpy.callCount === 3)
  })

  afterAll(async () => {
    await getGlobalDispatcher().close()
  })
})
