/* eslint-disable max-len, new-cap, promise/catch-or-return */
const { expect } = require('chai');
const Errors = require('common-errors');
const path = require('path');
const Promise = require('bluebird');
const SocketIOClient = require('socket.io-client');
const { inspectPromise } = require('@makeomatic/deploy');

describe('Router suite', function testSuite() {
  const Mservice = require('../../src');
  const auditLog = require('../../src/plugins/router/extensions/audit/log');
  const getAMQPRequest = require('../router/helpers/requests/amqp');
  const getHTTPRequest = require('../router/helpers/requests/http');
  const getSocketIORequest = require('../router/helpers/requests/socketIO');
  const verify = require('../router/helpers/verifyCase');

  const schemaLessAction = Mservice.routerExtension('validate/schemaLessAction');
  const qsParser = Mservice.routerExtension('validate/query-string-parser');
  const transportOptions = Mservice.routerExtension('validate/transport-options');

  const { ActionTransport } = Mservice;

  it('should throw error if plugin is not included', function test() {
    const service = new Mservice({ plugins: [] });
    expect(() => service.router).to.throw();
  });

  it('should return response', function test() {
    const service = new Mservice({
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
          attachSocketIO: true,
          handler: 'express',
        },
        router: {
          enabled: true,
        },
      },
      logger: {
        defaultLogger: true,
      },
      plugins: ['validator', 'logger', 'router', 'amqp', 'http', 'socketIO'],
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          enabled: {
            simple: 'simple',
            retry: 'retry',
          },
          prefix: 'action',
          transports: [
            ActionTransport.amqp,
            ActionTransport.http,
            ActionTransport.socketIO,
          ],
        },
        auth: {
          strategies: {
            token(request) {
              return Promise
                .resolve(request.params.token)
                .then((token) => {
                  if (token) return 'User';
                  throw new Errors.AuthenticationRequiredError('Invalid token');
                });
            },
          },
        },
      },
      socketIO: {
        router: {
          enabled: true,
        },
      },
      validator: [path.resolve(__dirname, '../router/helpers/schemas')],
    });

    return service
      .connect()
      .then(() => {
        const AMQPRequest = getAMQPRequest(service.amqp);
        const HTTPRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000' });
        const socketIOClient = SocketIOClient('http://0.0.0.0:3000');
        const socketIORequest = getSocketIORequest(socketIOClient);

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
              expect(error.message).to.be.equals(
                'An attempt was made to perform an operation without authentication: Invalid token'
              );
            } catch (e) {
              throw error;
            }
          },
        };

        const validationFailed = {
          expect: 'error',
          verify: (error) => {
            expect(error.name).to.be.equals('ValidationError');
            expect(error.message).to.be.equals(
              'action.simple validation failed: data.isAdmin should be boolean'
            );
          },
        };

        const accessDenied = {
          expect: 'error',
          verify: (error) => {
            expect(error.name).to.be.equals('NotPermittedError');
            expect(error.message).to.be.equals(
              'An attempt was made to perform an operation that is not permitted: You are not admin'
            );
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

        return Promise
          .all([
            socketIORequest('not.exists', {}).reflect().then(verify(routeNotFound)),
            socketIORequest('action.simple', {}).reflect().then(verify(authFailed)),
            socketIORequest('action.simple', { token: true, isAdmin: 42 }).reflect().then(verify(validationFailed)),
            socketIORequest('action.simple', { token: true }).reflect().then(verify(accessDenied)),
            socketIORequest('action.simple', { token: true, isAdmin: true }).reflect().then(verify(returnsResult)),
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
          ])
          .finally(() => Promise.all([
            service.close(),
            socketIOClient.close(),
          ]));
      });
  });

  it('should be able to parse query string when present & perform validation', function test() {
    const service = new Mservice({
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
          register: [schemaLessAction, auditLog, qsParser, transportOptions],
        },
      },
      validator: [path.resolve(__dirname, '../router/helpers/schemas')],
    });

    const HTTPRequest = getHTTPRequest({ url: 'http://0.0.0.0:3000', method: 'GET' });
    const rget = (qs, success = true, opts = {}) => (
      HTTPRequest('/action/qs', null, { qs, ...opts })
        .reflect()
        .then(inspectPromise(success))
    );

    return service
      .connect()
      .then(() => (
        Promise.all([
          rget({ sample: 1, bool: true }),
          rget({ sample: 'crap', bool: true }, false),
          rget({ sample: 13, bool: 'invalid' }, false),
          rget({ sample: 13, bool: '0' }),
          rget({ sample: 13, bool: '0', oops: 'q' }, false),
          rget({ sample: 13.4, bool: '0' }, false),
          rget(null, false, { json: { sample: 13.4, bool: '0' }, method: 'post' }),
        ])
      ))
      .finally(() => service.close());
  });

  it('should be able to set schema from action name', function test() {
    const service = new Mservice({
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
            auditLog,
          ],
        },
      },
      validator: [path.resolve(__dirname, '../router/helpers/schemas')],
    });

    return service.connect()
      .then(() => {
        const AMQPRequest = getAMQPRequest(service.amqp);

        const validationFailed = {
          expect: 'error',
          verify: (error) => {
            expect(error.name).to.be.equals('ValidationError');
            expect(error.message).to.be.equals(
              'withoutSchema validation failed: data.foo should be integer'
            );
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

  it('should scan for nested routes', function test() {
    const service = new Mservice({
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
          transports: [ActionTransport.amqp],
        },
        extensions: {
          enabled: ['preRequest', 'postRequest', 'preResponse'],
          register: [
            schemaLessAction,
            auditLog,
          ],
        },
      },
      validator: [path.resolve(__dirname, '../router/helpers/schemas')],
    });

    return service.connect()
      .then(() => {
        const AMQPRequest = getAMQPRequest(service.amqp);

        const validationFailed = {
          expect: 'error',
          verify: (error) => {
            expect(error.name).to.be.equals('ValidationError');
            expect(error.message).to.be.equals(
              'nested.test validation failed: data.foo should be integer'
            );
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
            AMQPRequest('action.nested.test', { foo: 'bar' }).reflect().then(verify(validationFailed)),
            AMQPRequest('action.nested.test', { foo: 42 }).reflect().then(verify(returnsResult)),
          ])
          .then(() => service.close());
      });
  });
});
