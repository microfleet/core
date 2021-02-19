import { strict, strictEqual, rejects, deepStrictEqual } from 'assert'
import { resolve } from 'path'
import { Writable } from 'stream'
import { AuthenticationRequiredError } from 'common-errors'
import { io as SocketIOClient } from 'socket.io-client'
import * as sinon from 'sinon'
import * as Bluebird from 'bluebird'
import { filter, range } from 'lodash'
import { Microfleet, PLUGIN_STATUS_FAIL } from '@microfleet/core'
import { Extensions, ServiceRequest } from '@microfleet/plugin-router'

import {
  verify,
  getHTTPRequest,
  getSocketioRequest,
  withResponseValidateAction
} from '../artifacts/utils'

const {
  auditLog,
  validateQueryStringParser: qsParser,
  validateTransportOptions: transportOptions
} = Extensions

describe('@microfleet/plugin-router', () => {
  it('should throw error if plugin is not included', () => {
    // eslint-disable-next-line no-console
    const service = new Microfleet({
      name: 'tester',
      plugins: [],
    })

    strict(service.router === undefined)
  })

  it('should return response', async () => {
    const service = new Microfleet({
      name: 'tester',
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
      // @todo one style for pass directory?
      validator: { schemas: ['../artifacts/schemas'] },
      amqp: {
        transport: {
          queue: 'simple-retry-test',
          neck: 10,
          bindPersistantQueueToHeadersExchange: true,
        },
      },
      http: {
        server: {
          attachSocketio: true,
          handler: 'hapi',
        },
      },
      router: {
        routes: {
          // @todo one style for pass directory?
          directory: resolve(__dirname, '../artifacts/actions'),
          prefix: 'action',
        },
        auth: {
          strategies: {
            async token(request: ServiceRequest) {
              if (request.params.token) {
                return 'User'
              }

              throw new AuthenticationRequiredError('Invalid token')
            },
          },
        },
      },
      'router-amqp': {
        retry: {
          enabled: true,
          min: 10,
          max: 50,
          factor: 1.3,
          maxRetries: 5,
          predicate: (_error: any, actionName: string) => actionName !== 'action.retry',
        },
      },
    })

    await service.connect()

    const { amqp } = service
    const httpRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' })
    const socketioClient = SocketIOClient('http://0.0.0.0:3000')
    const socketioRequest = getSocketioRequest(socketioClient)

    const routeNotFound = {
      expect: 'error',
      verify: (error: any) => {
        strictEqual(error.name, 'NotFoundError')
        strictEqual(error.message, 'Not Found: "route "not.exists" not found"')
      },
    }

    const authFailed = {
      expect: 'error',
      verify: (error: any) => {
        try {
          strictEqual(error.name, 'AuthenticationRequiredError')
          strictEqual(error.message, 'An attempt was made to perform an operation without authentication: Invalid token')
        } catch (e) {
          throw error
        }
      },
    }

    const validationFailed = {
      expect: 'error',
      verify: (error: any) => {
        strictEqual(error.name, 'HttpStatusError')
        strictEqual(error.message, 'simple validation failed: data/isAdmin should be boolean')
      },
    }

    const accessDenied = {
      expect: 'error',
      verify: (error: any) => {
        strictEqual(error.name, 'NotPermittedError')
        strictEqual(error.message, 'An attempt was made to perform an operation that is not permitted: You are not admin')
      },
    }

    const returnsResult = {
      expect: 'success',
      verify: (result: any) => {
        strictEqual(result.user, 'User')
        strictEqual(result.token, true)
        strictEqual(result.response, 'success')
      },
    }

    const retryFail = {
      expect: 'error',
      verify: (error: any) => {
        strictEqual(error.retryAttempt, 5)
      },
    }

    const retrySuccess = {
      expect: 'success',
      verify: (result: any) => {
        strictEqual(result, 3)
      },
    }

    const throwsFail = {
      expect: 'error',
      verify(error: any) {
        strictEqual(error.name, 'HttpStatusError')
        strictEqual(error.statusCode, 202)
      },
    }

    try {
      await Promise.all([
        socketioRequest('not.exists', {}).reflect().then(verify(routeNotFound)),
        socketioRequest('action.simple', {}).reflect().then(verify(authFailed)),
        socketioRequest('action.simple', { token: true, isAdmin: 42 }).reflect().then(verify(validationFailed)),
        socketioRequest('action.simple', { token: true }).reflect().then(verify(accessDenied)),
        socketioRequest('action.simple', { token: true, isAdmin: true }).reflect().then(verify(returnsResult)),

        httpRequest('/not/exists', {}).reflect().then(verify(routeNotFound)),
        httpRequest('/action/simple', {}).reflect().then(verify(authFailed)),
        httpRequest('/action/simple', { token: true, isAdmin: 42 }).reflect().then(verify(validationFailed)),
        httpRequest('/action/simple', { token: true }).reflect().then(verify(accessDenied)),
        httpRequest('/action/simple', { token: true, isAdmin: true }).reflect().then(verify(returnsResult)),

        // // non-existent action will be not processed by ms-amqp-transport
        amqp.publishAndWait('action.simple', {}).reflect().then(verify(authFailed)),
        amqp.publishAndWait('action.simple', { token: true, isAdmin: 42 }).reflect().then(verify(validationFailed)),
        amqp.publishAndWait('action.simple', { token: true }).reflect().then(verify(accessDenied)),
        amqp.publishAndWait('action.simple', { token: true, isAdmin: true }).reflect().then(verify(returnsResult)),
        amqp.publishAndWait('action.retry', 10).reflect().then(verify(retryFail)),
        amqp.publishAndWait('action.retry', 3).reflect().then(verify(retrySuccess)),
        amqp.publishAndWait('action.throws', {}).reflect().then(verify(throwsFail)),
      ])
    } finally {
      await service.close()
      socketioClient.close()
    }
  })

  it('should be able to parse query string when present & perform validation', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'http', 'router-http'],
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
          prefix: 'action',
        },
        extensions: {
          register: [auditLog(), qsParser, transportOptions],
        },
      },
      validator: { schemas: ['../artifacts/schemas'] },
    })

    const httpRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000', method: 'GET' })
    const rget = (qs: any, success = true, opts = {}) => {
      const req = httpRequest('/action/qs', null, { qs, ...opts })
      return success ? req : rejects(req)
    }

    await service.connect()

    try {
      await Promise.all([
        rget({ sample: 1, bool: true }),
        rget({ sample: 'crap', bool: true }, false),
        rget({ sample: 13, bool: 'invalid' }, false),
        rget({ sample: 13, bool: '0' }),
        rget({ sample: 13, bool: '0', oops: 'q' }, false),
        rget({ sample: 13.4, bool: '0' }, false),
        rget(null, false, { json: { sample: 13.4, bool: '0' }, method: 'post' }),
      ])
    } finally {
      await service.close()
    }
  })

  it('should be able to set schema and responseSchema from action name', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'amqp', 'router-amqp'],
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
          prefix: 'action',
        },
        extensions: {
          register: [
            auditLog(),
          ],
        },
      },
      validator: { schemas: ['../artifacts/schemas'] },
    })

    const validationFailed = {
      expect: 'error',
      verify: (error: any) => {
        strictEqual(error.name, 'HttpStatusError')
        strictEqual(error.message, 'without-schema validation failed: data/foo should be integer')
      },
    }

    const returnsResult = {
      expect: 'success',
      verify: (result: any) => {
        strictEqual(result.foo, 42)
      },
    }

    await service.connect()

    const { amqp } = service

    try {
      await Promise.all([
        amqp.publishAndWait('action.without-schema', { foo: 'bar' }).reflect().then(verify(validationFailed)),
        amqp.publishAndWait('action.without-schema', { foo: 42 }).reflect().then(verify(returnsResult)),
      ])
    } finally {
      await service.close()
    }
  })

  it('should scan for nested routes', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'amqp', 'router-amqp'],
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
          prefix: 'action',
        },
        extensions: {
          register: [
            auditLog()
          ],
        },
      },
      validator: { schemas: ['../artifacts/schemas'] },
    })

    const validationFailed = {
      expect: 'error',
      verify: (error: any) => {
        strictEqual(error.name, 'HttpStatusError')
        strictEqual(error.message, 'nested.test validation failed: data/foo should be integer')
      },
    }

    const returnsResult = {
      expect: 'success',
      verify: (result: any) => {
        strictEqual(result.foo, 42)
      },
    }

    await service.connect()

    const { amqp } = service

    try {
      await Promise.all([
        amqp.publishAndWait('action.nested.test', { foo: 'bar' }).reflect().then(verify(validationFailed)),
        amqp.publishAndWait('action.nested.test', { foo: 42 }).reflect().then(verify(returnsResult)),
        service.dispatch('nested.test', { params: { foo: 42 } }).reflect().then(verify(returnsResult))
      ])
    } finally {
      await service.close()
    }
  })

  it('should scan for generic routes', async () => {
    const service = new Microfleet({
      name: 'tester',
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
      'router-amqp': {
        prefix: 'amqp',
      },
    })

    const returnsResult = {
      expect: 'success',
      verify: (result: any) => {
        strictEqual(result.data.status, 'ok')
        strictEqual(result.data.failed.length, 0)
      },
    }

    await service.connect()

    const { amqp } = service
    const httpRequest = getHTTPRequest({ method: 'get', url: 'http://0.0.0.0:3000' })
    const socketioClient = SocketIOClient('http://0.0.0.0:3000')
    const socketioRequest = getSocketioRequest(socketioClient)

    try {
      await Promise.all([
        service.dispatch('generic.health', {}).reflect().then(verify(returnsResult)),
        httpRequest('/action/generic/health').reflect().then(verify(returnsResult)),
        socketioRequest('action.generic.health', {}).reflect().then(verify(returnsResult)),
        amqp.publishAndWait('amqp.action.generic.health', {}).reflect().then(verify(returnsResult))
      ])
    } finally {
      socketioClient.close()
      await service.close()
    }
  })

  it('should return an error when some service fails his healthcheck', async () => {
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
      ],
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

    const stub = sinon.stub(service, 'getHealthStatus')
    stub.returns(Promise.resolve({
      status: PLUGIN_STATUS_FAIL,
      alive: [],
      failed: [{ name: 'amqp', status: PLUGIN_STATUS_FAIL }, { name: 'http', status: PLUGIN_STATUS_FAIL }],
    }))

    const unhealthyState = {
      expect: 'error',
      verify: (error: any) => {
        strictEqual(error.statusCode, 500)
        strictEqual(error.message, 'Unhealthy due to following plugins: amqp, http')
      },
    }

    const unhealthyStateHTTP = {
      expect: 'error',
      verify: (error: any) => {
        strictEqual(error.statusCode, 500)
        strictEqual(error.message, 'An internal server error occurred')
      },
    }

    await service.connect()

    const { amqp } = service
    const httpRequest = getHTTPRequest({ method: 'get', url: 'http://0.0.0.0:3000' })

    try {
      await Promise.all([
        amqp.publishAndWait('action.generic.health', {}).reflect().then(verify(unhealthyState)),
        httpRequest('/action/generic/health').reflect().then(verify(unhealthyStateHTTP)),
      ])
    } finally {
      await service.close()
      stub.reset()
    }
  })

  it('should throw when unknown generic route is requested', async () => {
    const config = {
      name: 'tester',
      plugins: ['logger', 'validator', 'router'],
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
          prefix: 'action',
          enabledGenericActions: ['i-dont-know-you'],
        },
      },
      validator: { schemas: ['../artifacts/schemas'] },
    }

    try {
      new Microfleet(config)
    } catch (error: any) {
      strictEqual(
        error.message,
        // @todo custom error
        'Cannot find module \'/src/packages/plugin-router/src/actions/i-dont-know-you\' '
          + 'from \'packages/plugin-router/src/utils.ts\''
      )
    }
  })

  it('should be able to log error for unknown route', async () => {
    const spy = sinon.spy()
    const spyWritable = new Writable({
      write(chunk: string, _: any, callback: CallableFunction) {
        spy(JSON.parse(chunk))
        callback()
      },
      decodeStrings: false,
    })
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'http', 'router-http'],
      logger: {
        streams: {
          spy: { level: 'error', stream: spyWritable },
        },
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
        },
        extensions: {
          register: [
            auditLog(),
          ],
        },
      },
      validator: { schemas: ['../artifacts/schemas'] },
    })
    const httpRequest = getHTTPRequest({ method: 'get', url: 'http://0.0.0.0:3000' })

    await service.connect()
    await httpRequest('/404').reflect()
    await service.close()

    strictEqual('NotFoundError', spy.getCall(0).args[0].err.type)
  })

  it('should be able to disable an error logging for unknown route', async () => {
    const spy = sinon.spy()
    const spyWritable = new Writable({
      write(chunk: string, _: any, callback: CallableFunction) {
        spy(JSON.parse(chunk))
        callback()
      },
      decodeStrings: false,
    })
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'http', 'router-http'],
      logger: {
        streams: {
          spy: { level: 'info', stream: spyWritable },
        },
      },
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions'),
        },
        extensions: {
          register: [
            auditLog({ disableLogErrorsForNames: ['NotFoundError'] })
          ],
        },
      },
      validator: { schemas: ['../artifacts/schemas'] },
    })
    const httpRequest = getHTTPRequest({ method: 'get', url: 'http://0.0.0.0:3000' })

    await service.connect()
    await httpRequest('/404').reflect()
    await service.close()

    const errorCallArgs = spy.getCalls()
      .map((x) => x.args && x.args[0])
      .filter(Boolean)
      .find((x) => !!x.err)

    strictEqual('NotFoundError', errorCallArgs.err.type)
  })

  it('should return 418 in maintenance mode', async () => {
    const service = new Microfleet({
      name: 'tester',
      plugins: [
        'logger',
        'validator',
        'router',
        'amqp',
        'router-amqp',
        'http',
        'router-http',
      ],
      maintenanceMode: true,
      router: {
        routes: {
          directory: resolve(__dirname, '../artifacts/actions/maintenance'),
          prefix: 'maintenance',
        },
      },
    })

    const maintenanceModeIsEnabled = {
      expect: 'error',
      verify: (error: any) => {
        strictEqual(error.statusCode, 418)
        strictEqual(error.name, 'HttpStatusError')
        strictEqual(error.message, 'Server Maintenance')
      },
    }
    const resultIsReturned = {
      expect: 'success',
      verify: (result: any) => {
        strictEqual(result.success, true)
      },
    }
    const httpRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000', method: 'GET' })

    await service.connect()

    try {
      await Promise.all([
        // trigger usual route which performs global state update
        httpRequest('/maintenance/http', {}).reflect().then(verify(maintenanceModeIsEnabled)),
        // trigger route marked as read-only
        httpRequest('/maintenance/http-readonly', {}).reflect().then(verify(resultIsReturned)),
        // trigger read-only route which triggers non-read-only one
        httpRequest('/maintenance/http-amqp', {}).reflect().then(verify(maintenanceModeIsEnabled)),
      ])
    } finally {
      await service.close()
    }
  })

  describe('response-validation', () => {
    const returnsResult = {
      expect: 'success',
      verify: (result: any) => {
        deepStrictEqual(result, { validResponse: true })
      },
    }

    const returnsInvalidResult = {
      expect: 'success',
      verify: (result: any) => {
        deepStrictEqual(result, { validResponse: false, withAdditionalProperty: true })
      },
    }

    const throwsError = (schemaName: string) => ({
      expect: 'error',
      verify: (error: any) => {
        strictEqual(error.name, 'HttpStatusError')
        strictEqual(error.statusCode, 417)
        strictEqual(error.message, `response.${schemaName} validation failed: data should NOT have additional properties`)
      },
    })

    it('should validate response if schema provided and global validation enabled', async () => {
      const service = new Microfleet(withResponseValidateAction('validate-response-test', {
        router: {
          routes: {
            responseValidation: {
              enabled: true,
              maxSample: 100,
              panic: true,
            },
          },
        },
      }))

      await service.connect()

      const { amqp } = service
      const httpRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' })
      const socketioClient = SocketIOClient('http://0.0.0.0:3000')
      const socketioRequest = getSocketioRequest(socketioClient)

      const check = throwsError('validate-response')

      try {
        await Promise.all([
          socketioRequest('action.validate-response', { success: true }).reflect().then(verify(returnsResult)),
          socketioRequest('action.validate-response', { success: false }).reflect().then(verify(check)),
          httpRequest('/action/validate-response', { success: true }).reflect().then(verify(returnsResult)),
          httpRequest('/action/validate-response', { success: false }).reflect().then(verify(check)),
          amqp.publishAndWait('action.validate-response', { success: true }).reflect().then(verify(returnsResult)),
          amqp.publishAndWait('action.validate-response', { success: false }).reflect().then(verify(check)),
          // skip
          socketioRequest('action.validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult)),
          httpRequest('/action/validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult)),
          amqp.publishAndWait('action.validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult)),
        ])
      } finally {
        await service.close()
        socketioClient.close()
      }
    })

    it('should validate response and warn if `panic` is false', async () => {
      const service = new Microfleet(withResponseValidateAction('validate-response-test', {
        router: {
          routes: {
            responseValidation: {
              enabled: true,
              maxSample: 100,
              panic: false,
            },
          },
        },
      }))

      await service.connect()

      const { amqp } = service
      const httpRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' })
      const socketioClient = SocketIOClient('http://0.0.0.0:3000')
      const socketioRequest = getSocketioRequest(socketioClient)

      const spy = sinon.spy(service.log, 'warn')

      try {
        await Promise.all([
          socketioRequest('action.validate-response', { success: false }).reflect().then(verify(returnsInvalidResult)),
          httpRequest('/action/validate-response', { success: false }).reflect().then(verify(returnsInvalidResult)),
          amqp.publishAndWait('action.validate-response', { success: false }).reflect().then(verify(returnsInvalidResult)),
          // skip
          socketioRequest('action.validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult)),
          httpRequest('/action/validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult)),
          amqp.publishAndWait('action.validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult)),
        ])
      } finally {
        await service.close()
        socketioClient.close()
      }

      const calls = spy.getCalls() as any[] // fix for pino LogFn
      const warnings = calls.map(({ args: [{ err, action }, message] }) => ({ err, action, message }))

      strictEqual(filter(warnings, { message: '[response] validation failed' }).length, 3)
      strictEqual(filter(warnings, { action: 'validate-response' }).length, 3)
    })

    it('should validate response if schema provided and global validation enabled with limited percent', async () => {
      const service = new Microfleet(withResponseValidateAction('validate-response-test', {
        router: {
          routes: {
            responseValidation: {
              enabled: true,
              maxSample: 5,
              panic: true,
            },
          },
        },
      }))

      await service.connect()

      const { amqp } = service
      const httpRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' })
      const socketioClient = SocketIOClient('http://0.0.0.0:3000')
      const socketioRequest = getSocketioRequest(socketioClient)

      let failed = 0
      let success = 0
      const check = throwsError('validate-response')

      const count = (result: Bluebird.Inspection<any>) => {
        if (result.isFulfilled()) {
          success += 1
        } else {
          failed += 1
          verify(check)(result)
        }
      }

      try {
        await Bluebird.map(range(25), () => Promise.all([
          socketioRequest('action.validate-response', { success: false }).reflect().then(count),
          httpRequest('/action/validate-response', { success: false }).reflect().then(count),
          amqp.publishAndWait('action.validate-response', { success: false }).reflect().then(count),
          amqp.publishAndWait('action.validate-response', { success: false }).reflect().then(count),
        ]))
      } finally {
        await service.close()
        socketioClient.close()
      }

      // Math.random does not brings constant results))))
      strictEqual(failed < 20, true)
      strictEqual(success > 80, true)
    })

    it('should not validate response if schema provided and global validation disabled', async () => {
      const service = new Microfleet(withResponseValidateAction('validate-response-disabled-test', {
        router: {
          routes: {
            responseValidation: {
              enabled: false,
              maxSample: 100,
              panic: true,
            },
          },
        },
      }))

      await service.connect()

      const { amqp } = service
      const httpRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' })
      const socketioClient = SocketIOClient('http://0.0.0.0:3000')
      const socketioRequest = getSocketioRequest(socketioClient)

      try {
        await Promise.all([
          socketioRequest('action.validate-response', { success: false }).reflect().then(verify(returnsInvalidResult)),
          httpRequest('/action/validate-response', { success: false }).reflect().then(verify(returnsInvalidResult)),
          amqp.publishAndWait('action.validate-response', { success: false }).reflect().then(verify(returnsInvalidResult)),
        ])
      } finally {
        await service.close()
        socketioClient.close()
      }
    })

    it('should validate response if schema provided and schemaless action', async () => {
      const service = new Microfleet(withResponseValidateAction('shemaless-action-response-test', {
        router: {
          routes: {
            responseValidation: {
              enabled: true,
              maxSample: 100,
              panic: true,
            },
          },
        },
      }))

      await service.connect()

      const { amqp } = service
      const httpRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' })
      const socketioClient = SocketIOClient('http://0.0.0.0:3000')
      const socketioRequest = getSocketioRequest(socketioClient)
      const check = throwsError('validate-response-without-schema')

      try {
        await Promise.all([
          // socketio
          socketioRequest('action.validate-response-without-schema', { success: true }).reflect().then(verify(returnsResult)),
          socketioRequest('action.validate-response-without-schema', { success: false }).reflect().then(verify(check)),
          // http
          httpRequest('/action/validate-response-without-schema', { success: true }).reflect().then(verify(returnsResult)),
          httpRequest('/action/validate-response-without-schema', { success: false }).reflect().then(verify(check)),
          // amqp
          amqp.publishAndWait('action.validate-response-without-schema', { success: true }).reflect().then(verify(returnsResult)),
          amqp.publishAndWait('action.validate-response-without-schema', { success: false }).reflect().then(verify(check)),
        ])
      } finally {
        await service.close()
        socketioClient.close()
      }
    })
  })
})
