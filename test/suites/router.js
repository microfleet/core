const { expect } = require('chai');
const http = require('http');
const path = require('path');
const Promise = require('bluebird');
const SocketIOClient = require('socket.io-client');

describe('Router suite', function testSuite() {
  const MService = require('../../src');

  it('should throw error if plugin is not included', function test() {
    const service = new MService({ plugins: [] });
    expect(() => service.router).to.throw();
  });

  it('###', function test(done) {
    const service = new MService({
      plugins: [ 'validator', 'logger', 'router', 'socketIO', 'http' ],
      router: {
        actions: {
          directory: path.resolve(__dirname, './../router/actions'),
          enabled: {
            'foo': 'bar'
          },
          prefix: 'action',
          transports: ['amqp', 'http', 'socketIO']
        },
        auth: {
          strategies: {
            token: function auth(request) {
              return Promise.resolve({ user: request.params.token});
            }
          }
        },
        extensions: {
          onSocketIORequest: [
            function disableAuth(socket, request, service) {
              const config = service.config.socketIO.router;
              const actionName = request.params[config.requestActionKey];
              const routes = service.router.routes['socketIO'];

              const action = routes[actionName];
              action.auth = null;
              request.auth = { credentials: socket.purr };

              return Promise.resolve();
            }
          ]
        }
      },
      socketIO: {
        router: {
          enabled: true,
        },
        options: {}
      },
      http: {
        server: {
          attachSocketIO: true,
          handler: 'express',
          port: 3000,
        },
        router: {
          enabled: true,
        },
      },
    });

    service.connect().then(() => {
      const client = SocketIOClient('http://0.0.0.0:3000');
      client.emit('action', { action: 'action.bar', token: '1' }, (error, result) => {
        console.log(error, result);
      });

      http.get('http://0.0.0.0:3000/action/bar?token=1', (res) => {
        let body = '';

        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          console.log(body)
        });
      }).on('error', (error) => {
        console.log(error)
      });
    });
  });
});
