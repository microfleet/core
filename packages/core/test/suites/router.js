const { Writable } = require('stream');
const { expect } = require('chai');
const Errors = require('common-errors');
const path = require('path');
const assert = require('assert');
const sinon = require('sinon');
const Promise = require('bluebird');
const SocketIOClient = require('socket.io-client');

const { withResponseValidateAction } = require('../router/helpers/configs');
const { range, filter } = require('lodash');

describe('Router suite', function testSuite() {
  require('../config');
  const {
    Microfleet, routerExtension, ActionTransport, PLUGIN_STATUS_FAIL,
  } = require('../..');
  const auditLog = routerExtension('audit/log');
  const getAMQPRequest = require('../router/helpers/requests/amqp');
  const getHTTPRequest = require('../router/helpers/requests/http');
  const getSocketioRequest = require('../router/helpers/requests/socketio');
  const verify = require('../router/helpers/verifyCase');

  const schemaLessAction = routerExtension('validate/schemaLessAction');
  const qsParser = routerExtension('validate/query-string-parser');
  const transportOptions = routerExtension('validate/transport-options');

  it('should throw error if plugin is not included', function test() {
    const service = new Microfleet({ plugins: [] });
    assert(!service.router);
  });

  it('should return response', async function test() {
    const service = new Microfleet({
      name: 'tester',
      amqp: {
        transport: {
          connection: {
            host: 'rabbitmq',
          },
          queue: 'simple-retry-test',
          neck: 10,
          bindPersistantQueueToHeadersExchange: true,
        },
        router: {
          enabled: true,
        },
        retry: {
          enabled: true,
          min: 10,
          max: 50,
          factor: 1.3,
          maxRetries: 5,
          predicate(err, actionName) {
            return actionName !== 'action.retry';
          },
        },
      },
      http: {
        server: {
          attachSocketio: true,
          handler: 'hapi',
        },
        router: {
          enabled: true,
        },
      },
      logger: {
        defaultLogger: true,
      },
      plugins: ['validator', 'logger', 'router', 'amqp', 'http', 'socketio'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          enabled: {
            simple: 'simple',
            retry: 'retry',
            throws: 'throws',
          },
          prefix: 'action',
          transports: [
            ActionTransport.amqp,
            ActionTransport.http,
            ActionTransport.socketio,
          ],
        },
        extensions: { register: [] },
        auth: {
          strategies: {
            async token(request) {
              if (request.params.token) {
                return 'User';
              }

              throw new Errors.AuthenticationRequiredError('Invalid token');
            },
          },
        },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });

    await service.connect();

    const AMQPRequest = getAMQPRequest(service.amqp);
    const HTTPRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' });
    const socketioClient = SocketIOClient('http://0.0.0.0:3000');
    const socketioRequest = getSocketioRequest(socketioClient);

    const routeNotFound = {
      expect: 'error',
      verify: (error) => {
        expect(error.name).to.be.equals('NotFoundError');
        expect(error.message).to.be.equals('Not Found: "route "not.exists" not found"');
      },
    };

    const authFailed = {
      expect: 'error',
      verify: (error) => {
        try {
          expect(error.name).to.be.equals('AuthenticationRequiredError');
          expect(error.message).to.be.equals('An attempt was made to perform an operation without authentication: Invalid token');
        } catch (e) {
          throw error;
        }
      },
    };

    const validationFailed = {
      expect: 'error',
      verify: (error) => {
        expect(error.name).to.be.equals('HttpStatusError');
        expect(error.message).to.be.equals('action.simple validation failed: data.isAdmin should be boolean');
      },
    };

    const accessDenied = {
      expect: 'error',
      verify: (error) => {
        expect(error.name).to.be.equals('NotPermittedError');
        expect(error.message).to.be.equals('An attempt was made to perform an operation that is not permitted: You are not admin');
      },
    };

    const returnsResult = {
      expect: 'success',
      verify: (result) => {
        expect(result.user).to.be.equals('User');
        expect(result.token).to.be.equals(true);
        expect(result.response).to.be.equals('success');
      },
    };

    const retryFail = {
      expect: 'error',
      verify: (error) => {
        expect(error.retryAttempt).to.be.equal(5);
      },
    };

    const retrySuccess = {
      expect: 'success',
      verify: (result) => {
        expect(result).to.be.equal(3);
      },
    };

    const throwsFail = {
      expect: 'error',
      verify(error) {
        expect(error.name).to.be.equal('HttpStatusError');
        expect(error.statusCode).to.be.equal(202);
      },
    };

    try {
      await Promise.all([
        socketioRequest('not.exists', {}).reflect().then(verify(routeNotFound)),
        socketioRequest('action.simple', {}).reflect().then(verify(authFailed)),
        socketioRequest('action.simple', { token: true, isAdmin: 42 }).reflect().then(verify(validationFailed)),
        socketioRequest('action.simple', { token: true }).reflect().then(verify(accessDenied)),
        socketioRequest('action.simple', { token: true, isAdmin: true }).reflect().then(verify(returnsResult)),

        HTTPRequest('/not/exists', {}).reflect().then(verify(routeNotFound)),
        HTTPRequest('/action/simple', {}).reflect().then(verify(authFailed)),
        HTTPRequest('/action/simple', { token: true, isAdmin: 42 }).reflect().then(verify(validationFailed)),
        HTTPRequest('/action/simple', { token: true }).reflect().then(verify(accessDenied)),
        HTTPRequest('/action/simple', { token: true, isAdmin: true }).reflect().then(verify(returnsResult)),

        // non-existent action will be not processed by ms-amqp-transport
        AMQPRequest('action.simple', {}).reflect().then(verify(authFailed)),
        AMQPRequest('action.simple', { token: true, isAdmin: 42 }).reflect().then(verify(validationFailed)),
        AMQPRequest('action.simple', { token: true }).reflect().then(verify(accessDenied)),
        AMQPRequest('action.simple', { token: true, isAdmin: true }).reflect().then(verify(returnsResult)),
        AMQPRequest('action.retry', 10).reflect().then(verify(retryFail)),
        AMQPRequest('action.retry', 3).reflect().then(verify(retrySuccess)),
        AMQPRequest('action.throws', {}).reflect().then(verify(throwsFail)),
      ]);
    } finally {
      await Promise.all([
        service.close(),
        socketioClient.close(),
      ]);
    }
  });

  it('should be able to parse query string when present & perform validation', async function test() {
    const service = new Microfleet({
      name: 'tester',
      http: {
        server: {
          handler: 'hapi',
        },
        router: {
          enabled: true,
        },
      },
      logger: {
        defaultLogger: true,
      },
      plugins: ['validator', 'logger', 'router', 'http'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          prefix: 'action',
          enabled: { qs: 'qs' },
          transports: [ActionTransport.http],
        },
        extensions: {
          enabled: ['preValidate', 'postRequest', 'preResponse', 'preRequest'],
          register: [schemaLessAction, auditLog(), qsParser, transportOptions],
        },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });

    const HTTPRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000', method: 'GET' });
    const rget = (qs, success = true, opts = {}) => {
      const req = HTTPRequest('/action/qs', null, { qs, ...opts });
      return success ? req : assert.rejects(req);
    };

    await service.connect();

    try {
      await Promise.all([
        rget({ sample: 1, bool: true }),
        rget({ sample: 'crap', bool: true }, false),
        rget({ sample: 13, bool: 'invalid' }, false),
        rget({ sample: 13, bool: '0' }),
        rget({ sample: 13, bool: '0', oops: 'q' }, false),
        rget({ sample: 13.4, bool: '0' }, false),
        rget(null, false, { json: { sample: 13.4, bool: '0' }, method: 'post' }),
      ]);
    } finally {
      await service.close();
    }
  });

  it('should be able to set schema and responseSchema from action name', function test() {
    const service = new Microfleet({
      name: 'tester',
      amqp: {
        transport: {
          connection: {
            host: 'rabbitmq',
          },
        },
        router: {
          enabled: true,
        },
      },
      logger: {
        defaultLogger: true,
      },
      plugins: ['validator', 'logger', 'router', 'amqp'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          enabled: { withoutSchema: 'withoutSchema' },
          prefix: 'action',
          setTransportsAsDefault: true,
          transports: [ActionTransport.amqp],
        },
        extensions: {
          enabled: ['preRequest', 'postRequest', 'preResponse'],
          register: [
            schemaLessAction,
            auditLog(),
          ],
        },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });

    return service.connect()
      .then(() => {
        const AMQPRequest = getAMQPRequest(service.amqp);

        const validationFailed = {
          expect: 'error',
          verify: (error) => {
            expect(error.name).to.be.equals('HttpStatusError');
            expect(error.message).to.be.equals('withoutSchema validation failed: data.foo should be integer');
          },
        };

        const returnsResult = {
          expect: 'success',
          verify: (result) => {
            expect(result.foo).to.be.equals(42);
          },
        };

        return Promise
          .all([
            AMQPRequest('action.withoutSchema', { foo: 'bar' }).reflect().then(verify(validationFailed)),
            AMQPRequest('action.withoutSchema', { foo: 42 }).reflect().then(verify(returnsResult)),
          ])
          .finally(() => service.close());
      });
  });

  it('should scan for nested routes', async function test() {
    const service = new Microfleet({
      name: 'tester',
      amqp: {
        transport: {
          connection: {
            host: 'rabbitmq',
          },
        },
        router: {
          enabled: true,
        },
      },
      logger: {
        defaultLogger: true,
      },
      plugins: ['validator', 'logger', 'router', 'amqp'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          prefix: 'action',
          setTransportsAsDefault: true,
          transports: [ActionTransport.amqp, ActionTransport.internal],
        },
        extensions: {
          enabled: ['preRequest', 'postRequest', 'preResponse'],
          register: [
            schemaLessAction,
            auditLog(),
          ],
        },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });

    await service.connect();
    const AMQPRequest = getAMQPRequest(service.amqp);

    const validationFailed = {
      expect: 'error',
      verify: (error) => {
        expect(error.name).to.be.equals('HttpStatusError');
        expect(error.message).to.be.equals('nested.test validation failed: data.foo should be integer');
      },
    };

    const returnsResult = {
      expect: 'success',
      verify: (result) => {
        expect(result.foo).to.be.equals(42);
      },
    };

    await AMQPRequest('action.nested.test', { foo: 'bar' }).reflect().then(verify(validationFailed));
    await AMQPRequest('action.nested.test', { foo: 42 }).reflect().then(verify(returnsResult));
    await service.dispatch('nested.test', { params: { foo: 42 } }).reflect().then(verify(returnsResult));

    await service.close();
  });

  it('should scan for generic routes', async function test() {
    const service = new Microfleet({
      name: 'tester',
      amqp: {
        transport: {
          connection: {
            host: 'rabbitmq',
          },
        },
        router: {
          enabled: true,
          prefix: 'amqp',
        },
      },
      http: {
        server: {
          attachSocketio: true,
          handler: 'hapi',
        },
        router: {
          enabled: true,
        },
      },
      logger: {
        defaultLogger: true,
      },
      plugins: ['validator', 'logger', 'router', 'amqp', 'http', 'socketio'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          prefix: 'action',
          setTransportsAsDefault: true,
          transports: [
            ActionTransport.amqp,
            ActionTransport.http,
            ActionTransport.socketio,
            ActionTransport.internal,
          ],
          enabledGenericActions: ['health'],
        },
        extensions: {
          enabled: ['preRequest', 'postRequest', 'preResponse'],
          register: [
            schemaLessAction,
            auditLog(),
          ],
        },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });

    await service.connect();
    const AMQPRequest = getAMQPRequest(service.amqp);
    const HTTPRequest = getHTTPRequest({ method: 'get', url: 'http://0.0.0.0:3000' });
    const socketioClient = SocketIOClient('http://0.0.0.0:3000');
    const socketioRequest = getSocketioRequest(socketioClient);

    const returnsResult = {
      expect: 'success',
      verify: (result) => {
        expect(result.data.status).to.be.equals('ok');
        expect(result.data.failed).to.have.lengthOf(0);
      },
    };

    await service.dispatch('generic.health', {}).reflect().then(verify(returnsResult));
    await HTTPRequest('/action/generic/health').reflect().then(verify(returnsResult));
    await socketioRequest('action.generic.health', {}).reflect().then(verify(returnsResult));
    await AMQPRequest('amqp.action.generic.health', {}).reflect().then(verify(returnsResult));

    await service.close();
  });

  it('should return an error when some service fails his healthcheck', async function test() {
    const service = new Microfleet({
      name: 'tester',
      amqp: {
        transport: {
          connection: {
            host: 'rabbitmq',
          },
        },
        router: {
          enabled: true,
        },
      },
      http: {
        server: {
          handler: 'hapi',
        },
        router: {
          enabled: true,
        },
      },
      logger: {
        defaultLogger: true,
      },
      plugins: ['validator', 'logger', 'router', 'amqp', 'http'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          prefix: 'action',
          setTransportsAsDefault: true,
          transports: [
            ActionTransport.amqp,
            ActionTransport.http,
            ActionTransport.internal,
          ],
          enabledGenericActions: ['health'],
        },
        extensions: {
          enabled: ['preRequest', 'postRequest', 'preResponse'],
          register: [
            schemaLessAction,
            auditLog(),
          ],
        },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });

    const stub = sinon.stub(service, 'getHealthStatus');
    stub.returns({
      status: PLUGIN_STATUS_FAIL,
      alive: [],
      failed: [{
        name: 'amqp',
      }, {
        name: 'http',
      }],
    });

    await service.connect();
    const AMQPRequest = getAMQPRequest(service.amqp);
    const HTTPRequest = getHTTPRequest({ method: 'get', url: 'http://0.0.0.0:3000' });

    const unhealthyState = {
      expect: 'error',
      verify: (error) => {
        expect(error.statusCode).to.be.equals(500);
        expect(error.message).to.be.equals('Unhealthy due to following plugins: amqp, http');
      },
    };

    const unhealthyStateHTTP = {
      expect: 'error',
      verify: (error) => {
        expect(error.statusCode).to.be.equals(500);
        expect(error.message).to.be.equals('An internal server error occurred');
      },
    };

    await AMQPRequest('action.generic.health', {}).reflect().then(verify(unhealthyState));
    await HTTPRequest('/action/generic/health').reflect().then(verify(unhealthyStateHTTP));

    await service.close();
    stub.reset();
  });

  it('should throw when unknown generic route is requested', async function test() {
    const config = {
      name: 'tester',
      plugins: ['logger', 'validator', 'router'],
      logger: {
        defaultLogger: true,
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          prefix: 'action',
          setTransportsAsDefault: true,
          transports: [
            ActionTransport.internal,
          ],
          enabledGenericActions: ['i-dont-know-you'],
        },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    };

    expect(() => new Microfleet(config)).to.throw(Errors.ValidationError);
  });

  it('should be able to log error for unknown route', async function test() {
    const spy = sinon.spy();
    const spyWritable = new Writable({
      write(chunk, encoding, callback) {
        spy(JSON.parse(chunk));
        callback();
      },
      decodeStrings: false,
    });
    const service = new Microfleet({
      name: 'tester',
      http: { server: { handler: 'hapi' }, router: { enabled: true } },
      logger: {
        defaultLogger: true,
        streams: {
          spy: { level: 'error', stream: spyWritable },
        },
      },
      plugins: ['validator', 'logger', 'router', 'http'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          setTransportsAsDefault: true,
          transports: [ActionTransport.http],
        },
        extensions: { enabled: ['preRequest', 'preResponse'], register: [auditLog()] },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });
    const HTTPRequest = getHTTPRequest({ method: 'get', url: 'http://0.0.0.0:3000' });

    await service.connect();
    await HTTPRequest('/404').reflect();
    await service.close();

    assert.equal('NotFoundError', spy.getCall(0).args[0].err.type);
  });

  it('should be able to disable an error logging for unknown route', async function test() {
    const spy = sinon.spy();
    const spyWritable = new Writable({
      write(chunk, encoding, callback) {
        spy(JSON.parse(chunk));
        callback();
      },
      decodeStrings: false,
    });
    const service = new Microfleet({
      name: 'tester',
      http: { server: { handler: 'hapi' }, router: { enabled: true } },
      logger: {
        defaultLogger: true,
        streams: {
          spy: { level: 'info', stream: spyWritable },
        },
      },
      plugins: ['validator', 'logger', 'router', 'http'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          setTransportsAsDefault: true,
          transports: [ActionTransport.http],
        },
        extensions: { enabled: ['preRequest', 'preResponse'], register: [auditLog({ disableLogErrorsForNames: ['NotFoundError'] })] },
      },
      validator: { schemas: ['../router/helpers/schemas'] },
    });
    const HTTPRequest = getHTTPRequest({ method: 'get', url: 'http://0.0.0.0:3000' });

    await service.connect();
    await HTTPRequest('/404').reflect();
    await service.close();

    const errorCallArgs = spy.getCalls()
      .map((x) => x.args && x.args[0])
      .filter(Boolean)
      .find((x) => !!x.err);

    assert.equal('NotFoundError', errorCallArgs.err.type);
  });

  it('should return 418 in maintenance mode', async function test() {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['logger', 'validator', 'router', 'http', 'amqp'],
      maintenanceMode: true,
      http: {
        server: {
          handler: 'hapi',
        },
        router: {
          enabled: true,
        },
      },
      amqp: {
        transport: {
          connection: {
            host: 'rabbitmq',
          },
        },
        router: {
          enabled: true,
        },
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions/maintenance'),
          prefix: 'maintenance',
          transports: [ActionTransport.http, ActionTransport.amqp],
        },
        extensions: {
          enabled: ['preValidate', 'postRequest', 'preResponse', 'preRequest'],
          register: [],
        },
      },
    });

    const maintenanceModeIsEnabled = {
      expect: 'error',
      verify: (error) => {
        expect(error.statusCode).to.be.equals(418);
        expect(error.name).to.be.equals('HttpStatusError');
        expect(error.message).to.be.equals('Server Maintenance');
      },
    };
    const resultIsReturned = {
      expect: 'success',
      verify: (result) => {
        expect(result.success).to.be.equals(true);
      },
    };

    await service.connect().then(async () => {
      const HTTPRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000', method: 'GET' });
      return Promise
        .all([
        // trigger usual route which performs global state update
          HTTPRequest('/maintenance/http', {}).reflect().then(verify(maintenanceModeIsEnabled)),
          // trigger route marked as read-only
          HTTPRequest('/maintenance/http-readonly', {}).reflect().then(verify(resultIsReturned)),
          // trigger read-only route which triggers non-read-only one
          HTTPRequest('/maintenance/http-amqp', {}).reflect().then(verify(maintenanceModeIsEnabled)),
        ]);
    }).finally(() => service.close());
  });

  describe('response-validation', () => {
    const returnsResult = {
      expect: 'success',
      verify: (result) => {
        expect(result).to.deep.equal({ validResponse: true });
      },
    };

    const returnsInvalidResult = {
      expect: 'success',
      verify: (result) => {
        expect(result).to.deep.equal({ validResponse: false, withAdditionalProperty: true });
      },
    };

    const throwsError = (schemaName) => ({
      expect: 'error',
      verify: (error) => {
        expect(error.name).to.be.equal('HttpStatusError');
        expect(error.statusCode).to.be.equal(417);
        expect(error.message).to.be.equal(`response.${schemaName} validation failed: data should NOT have additional properties`);
      }
    })

    it('should validate response if schema provided and global validation enabled', async () => {
      const config = withResponseValidateAction('validate-response-test', {
        router: {
          routes: {
            responseValidation: {
              enabled: true,
              maxSample: 100,
              panic: true,
            },
          },
        }
      })

      const service = new Microfleet(config);

      await service.connect();

      const AMQPRequest = getAMQPRequest(service.amqp);
      const HTTPRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' });
      const socketIOClient = SocketIOClient('http://0.0.0.0:3000');
      const socketioRequest = getSocketioRequest(socketIOClient);

      const check = throwsError('validate-response')

      await socketioRequest('action.validate-response', { success: true }).reflect().then(verify(returnsResult));
      await socketioRequest('action.validate-response', { success: false }).reflect().then(verify(check));

      await HTTPRequest('/action/validate-response', { success: true }).reflect().then(verify(returnsResult));
      await HTTPRequest('/action/validate-response', { success: false }).reflect().then(verify(check));

      await AMQPRequest('action.validate-response', { success: true }).reflect().then(verify(returnsResult));
      await AMQPRequest('action.validate-response', { success: false }).reflect().then(verify(check));

      await socketioRequest('action.validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult));
      await HTTPRequest('/action/validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult));
      await AMQPRequest('action.validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult));

      await service.close()
    })

    it('should validate response and warn if `panic` is false', async () => {
      const config = withResponseValidateAction('validate-response-test', {
        router: {
          routes: {
            responseValidation: {
              enabled: true,
              maxSample: 100,
              panic: false,
            },
          },
        }
      })

      const service = new Microfleet(config);

      await service.connect();

      const AMQPRequest = getAMQPRequest(service.amqp);
      const HTTPRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' });
      const socketIOClient = SocketIOClient('http://0.0.0.0:3000');
      const socketioRequest = getSocketioRequest(socketIOClient);

      const spy = sinon.spy(service.log, 'warn')

      await socketioRequest('action.validate-response', { success: false }).reflect().then(verify(returnsInvalidResult));
      await HTTPRequest('/action/validate-response', { success: false }).reflect().then(verify(returnsInvalidResult));
      await AMQPRequest('action.validate-response', { success: false }).reflect().then(verify(returnsInvalidResult));

      await socketioRequest('action.validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult));
      await HTTPRequest('/action/validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult));
      await AMQPRequest('action.validate-response-skip', { success: false }).reflect().then(verify(returnsInvalidResult));

      const calls = spy.getCalls()
      const warnings = calls.map(({ args: [{ err, action }, message]}) => ({ err, action, message }))

      expect(filter(warnings, { message: '[response] validation failed' })).to.have.length(3)
      expect(filter(warnings, { action: 'validate-response' })).to.have.length(3)

      spy.restore()
      await service.close()
    })

    it('should validate response if schema provided and global validation enabled with limited percent', async () => {
      const config = withResponseValidateAction('validate-response-test', {
        router: {
          routes: {
            responseValidation: {
              enabled: true,
              maxSample: 5,
              panic: true,
            },
          },
        }
      })

      const service = new Microfleet(config);

      await service.connect();

      const AMQPRequest = getAMQPRequest(service.amqp);
      const HTTPRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' });
      const socketIOClient = SocketIOClient('http://0.0.0.0:3000');
      const socketioRequest = getSocketioRequest(socketIOClient);

      let failed = 0;
      let success = 0;
      const check = throwsError('validate-response');

      const count = (result) => {
        if (result.isFulfilled()) {
          success += 1
        } else {
          failed += 1
          verify(check)(result)
        }
      }

      const promises = Promise.map(range(25), async () => {
        await socketioRequest('action.validate-response', { success: false }).reflect().then(count);
        await HTTPRequest('/action/validate-response', { success: false }).reflect().then(count);
        await AMQPRequest('action.validate-response', { success: false }).reflect().then(count);
        await AMQPRequest('action.validate-response', { success: false }).reflect().then(count);
      })

      await Promise.all(promises)
      console.debug('TEST', { failed, success })

      // Math.random does not brings constant results))))
      expect(failed).to.be.below(20);
      expect(success).to.be.above(80);

      await service.close()
    })

    it('should not validate response if schema provided and global validation disabled', async () => {
      const config = withResponseValidateAction('validate-response-disabled-test', {
        router: {
          routes: {
            responseValidation: {
              enabled: false,
              maxSample: 100,
              panic: true,
            },
          },
        }
      })
      const service = new Microfleet(config);

      await service.connect();

      const AMQPRequest = getAMQPRequest(service.amqp);
      const HTTPRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' });
      const socketIOClient = SocketIOClient('http://0.0.0.0:3000');
      const socketioRequest = getSocketioRequest(socketIOClient);

      await socketioRequest('action.validate-response', { success: false }).reflect().then(verify(returnsInvalidResult));
      await HTTPRequest('/action/validate-response', { success: false }).reflect().then(verify(returnsInvalidResult));
      await AMQPRequest('action.validate-response', { success: false }).reflect().then(verify(returnsInvalidResult));

      await service.close()
    })

    it('should validate response if schema provided and schemalessAction plugin enabled', async () => {
      const config = withResponseValidateAction('shemaless-action-response-test', {
        router: {
          routes: {
            responseValidation: {
              enabled: true,
              maxSample: 100,
              panic: true,
            },
          },
          extensions: {
            register: [ schemaLessAction ],
          },
        }
      })

      const service = new Microfleet(config);

      await service.connect();

      const AMQPRequest = getAMQPRequest(service.amqp);
      const HTTPRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' });
      const socketIOClient = SocketIOClient('http://0.0.0.0:3000');
      const socketioRequest = getSocketioRequest(socketIOClient);
      const check = throwsError('validate-response-without-schema')

      await socketioRequest('action.validate-response-without-schema', { success: true }).reflect().then(verify(returnsResult));
      await socketioRequest('action.validate-response-without-schema', { success: false }).reflect().then(verify(check));

      await HTTPRequest('/action/validate-response-without-schema', { success: true }).reflect().then(verify(returnsResult));
      await HTTPRequest('/action/validate-response-without-schema', { success: false }).reflect().then(verify(check));

      await AMQPRequest('action.validate-response-without-schema', { success: true }).reflect().then(verify(returnsResult));
      await AMQPRequest('action.validate-response-without-schema', { success: false }).reflect().then(verify(check));

      await service.close()
    })
  })
});
