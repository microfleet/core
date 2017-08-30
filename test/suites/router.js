/* eslint-disable max-len, new-cap, promise/catch-or-return */
const { ActionTransport } = require('./../../src');
const auditLog = require('./../../src/plugins/router/extensions/audit/log');
const { expect } = require('chai');
const Errors = require('common-errors');
const schemaLessAction = require('./../../src/plugins/router/extensions/validate/schemaLessAction');
const getAMQPRequest = require('./../router/helpers/requests/amqp');
const getHTTPRequest = require('./../router/helpers/requests/http');
const getSocketIORequest = require('./../router/helpers/requests/socketIO');
const path = require('path');
const Promise = require('bluebird');
const SocketIOClient = require('socket.io-client');
const verify = require('./../router/helpers/verifyCase');
const assert = require('assert');

describe('Router suite', function testSuite() {
  const MService = require('../../src');

  it('should throw error if plugin is not included', function test() {
    const service = new MService({ plugins: [] });
    expect(() => service.router).to.throw();
  });

  it('should return response', function test(done) {
    const service = new MService({
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

    service.connect()
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

        Promise.map([
          () => socketIORequest('not.exists', {}).reflect().then(verify(routeNotFound)),
          () => socketIORequest('action.simple', {}).reflect().then(verify(authFailed)),
          () => socketIORequest('action.simple', { token: true, isAdmin: 42 }).reflect().then(verify(validationFailed)),
          () => socketIORequest('action.simple', { token: true }).reflect().then(verify(accessDenied)),
          () => socketIORequest('action.simple', { token: true, isAdmin: true }).reflect().then(verify(returnsResult)),
          () => HTTPRequest('/not/exists', {}).reflect().then(verify(routeNotFound)),
          () => HTTPRequest('/action/simple', {}).reflect().then(verify(authFailed)),
          () => HTTPRequest('/action/simple', { token: true, isAdmin: 42 }).reflect().then(verify(validationFailed)),
          () => HTTPRequest('/action/simple', { token: true }).reflect().then(verify(accessDenied)),
          () => HTTPRequest('/action/simple', { token: true, isAdmin: true }).reflect().then(verify(returnsResult)),
          // non-existent action will be not processed by ms-amqp-transport
          () => AMQPRequest('action.simple', {}).reflect().then(verify(authFailed)),
          () => AMQPRequest('action.simple', { token: true, isAdmin: 42 }).reflect().then(verify(validationFailed)),
          () => AMQPRequest('action.simple', { token: true }).reflect().then(verify(accessDenied)),
          () => AMQPRequest('action.simple', { token: true, isAdmin: true }).reflect().then(verify(returnsResult)),
          () => AMQPRequest('action.retry', 10).reflect().then(verify(retryFail)),
          () => AMQPRequest('action.retry', 3).reflect().then(verify(retrySuccess)),
        ], handler => handler())
          .then(() => service.close())
          .asCallback(done);
      });
  });

  it('should be able to set schema from action name', function test() {
    const service = new MService({
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

        return Promise.map(
          [
            () => AMQPRequest('action.withoutSchema', { foo: 'bar' }).reflect().then(verify(validationFailed)),
            () => AMQPRequest('action.withoutSchema', { foo: 42 }).reflect().then(verify(returnsResult)),
          ],
          handler => handler()
        ).then(() => service.close());
      });
  });

  it('should scan for nested routes', function test() {
    const service = new MService({
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

        return Promise.map(
          [
            () => AMQPRequest('action.nested.test', { foo: 'bar' }).reflect().then(verify(validationFailed)),
            () => AMQPRequest('action.nested.test', { foo: 42 }).reflect().then(verify(returnsResult)),
          ],
          handler => handler()
        )
          .then(() => service.close());
      });
  });

  it('should throw error for duplicates', (done) => {
    try {
      const service = new MService({
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
            directory: [
              path.resolve(__dirname, '../router/helpers/modules/foo/actions'),
              path.resolve(__dirname, '../router/helpers/modules/foo-duplicate/actions'),
            ],
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
        validator: [
          path.resolve(__dirname, '../router/helpers/modules/foo/schemas'),
          path.resolve(__dirname, '../router/helpers/modules/foo-duplicate/schemas'),
        ],
      });
    } catch (error) {
      assert.equal(
        error.message,
        'The specified \'foo.bar already exists\' value is already in use for: '
      );
      done();
    }
  });

  it('should be able to load routes from array of directories', () => {
    const service = new MService({
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
          directory: [
            path.resolve(__dirname, '../router/helpers/modules/foo/actions'),
            path.resolve(__dirname, '../router/helpers/modules/bar/actions'),
          ],
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
      validator: [
        path.resolve(__dirname, '../router/helpers/modules/foo/schemas'),
        path.resolve(__dirname, '../router/helpers/modules/bar/schemas'),
      ],
    });

    return service
      .connect()
      .then(() => {
        const AMQPRequest = getAMQPRequest(service.amqp);

        return AMQPRequest('action.bar', {});
      })
      .reflect()
      .then(result => {
        assert.equal(result.value(), 'bar');
      })
      .then(() => service.close());
  });
});
