const { expect } = require('chai');
const Errors = require('common-errors');
const http = require('http');
const path = require('path');
const request = require('request');
const Promise = require('bluebird');
const SocketIOClient = require('socket.io-client');
const querystring = require('querystring');

describe('Router suite', function testSuite() {
  const MService = require('../../src');

  it('should throw error if plugin is not included', function test() {
    const service = new MService({ plugins: [] });
    expect(() => service.router).to.throw();
  });

  it('should return response', function test(done) {
    const service = new MService({
      plugins: [ 'validator', 'logger', 'router', 'socketIO', 'http' ],
      validator: [
        path.resolve(__dirname, '../router/helpers/schemas'),
      ],
      logger: true,
      router: {
        routes: {
          directory: path.resolve(__dirname, '../router/helpers/actions'),
          transports: ['http', 'socketIO'],
        },
        auth: {
          strategies: {
            token: function auth(request) {
              return Promise.resolve(request.params.token)
                .then(token => {
                  if (token) {
                    return Promise.resolve('User');
                  }

                  return Promise.reject(
                    new Errors.AuthenticationRequiredError('Invalid token')
                  )
                });
            }
          }
        },
      },
      socketIO: {
        router: {
          enabled: true,
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
    });

    service.connect()
      .then(() => {
        const client = SocketIOClient('http://0.0.0.0:3000');
        const socketIORequest = params =>
          Promise.fromCallback(callback =>
            client.emit('action', params, callback));
        const httpRequest = (action, params) => {
          return new Promise((resolve, reject) => {
            request({
              uri: `http://0.0.0.0:3000${action}`,
              method: 'POST',
              json: params,
            }, (error, response, body) => {
              if (!error && response.statusCode == 200) {
                resolve(body);
              } else {
                reject(body);
              }
            });
          });
        };

        const throwError = () => {
          throw new Error();
        };

        // route not found
        const case1 = error => {
          expect(error.name).to.be.equals('NotFoundError');
          expect(error.message).to.be.equals('Not Found: "not.exists"');
        };
        // auth failed
        const case2 = error => {
          expect(error.name).to.be.equals('AuthenticationRequiredError');
          expect(error.message).to.be.equals(
            'An attempt was made to perform an operation without authentication: Invalid token'
          );
        };
        // validation failed
        const case3 = error => {
          expect(error.name).to.be.equals('ValidationError');
          expect(error.message).to.be.equals(
            'action.simple validation failed: data.isAdmin should be boolean'
          );
        };
        // access denied
        const case4 = error => {
          expect(error.name).to.be.equals('NotPermittedError');
          expect(error.message).to.be.equals(
            'An attempt was made to perform an operation that is not permitted: You are not admin'
          );
        };
        // returns result
        const case5 = result => {
          expect(result.user).to.be.equals('User');
          expect(result.token).to.be.equals(true);
          expect(result.response).to.be.equals('success');
        };

        Promise.map(
          [
            () => socketIORequest({ action: 'not.exists' }).then(throwError).catch(case1),
            () => socketIORequest({ action: 'action.simple' }).then(throwError).catch(case2),
            () => socketIORequest({ action: 'action.simple', token: true, isAdmin: 42 }).then(throwError).catch(case3),
            () => socketIORequest({ action: 'action.simple', token: true }).then(throwError).catch(case4),
            () => socketIORequest({ action: 'action.simple', token: true, isAdmin: true }).then(case5).catch(throwError),
            () => httpRequest('/not/exists', {}).then(throwError).catch(case1),
            () => httpRequest('/action/simple', {}).then(throwError).catch(case2),
            () => httpRequest('/action/simple', { token: true, isAdmin: 42 }).then(throwError).catch(case3),
            () => httpRequest('/action/simple', { token: true }).then(throwError).catch(case4),
            () => httpRequest('/action/simple', { token: true, isAdmin: true }).then(case5).catch(throwError),
          ],
          handler => handler()
        ).asCallback(done);
      });
  });
});
