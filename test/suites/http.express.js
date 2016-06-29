const { expect } = require('chai');
const express = require('express');
const http = require('http');
const SocketIOClient = require('socket.io-client');

describe('Http server with \'express\' handler suite', function testSuite() {
  const Mservice = require('../../src');

  it('should start \'express\' http server when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'http'],
      http: {
        server: {
          handler: 'express',
          handlerConfig: {
            properties: {
              'x-powered-by': 'mservice test'
            }
          },
          port: 3000,
        }
      },
    });

    return this.service.connect()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(server => {
        expect(server.handler).to.be.instanceof(Function);
        expect(server.server).to.be.instanceof(http.Server);
        expect(this.service.http.handler).to.be.instanceof(Function);
        expect(this.service.http.server).to.be.instanceof(http.Server);
        expect(this.service.http.handler.get('x-powered-by')).to.be.equals('mservice test');
      });
  });

  it('should can add routes after start', function test(done) {
    const application = this.service.http.handler;
    const router = express.Router();
    router.use('/bar', function(req, res, next) {
      res.send('/bar route');
      next();
    });
    application.use('/', router);

    http.get('http://0.0.0.0:3000/bar', (res) => {
      let body = '';

      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        expect(body).to.be.equals('/bar route');
        done();
      });
    }).on('error', (error) => {
      done(error);
    });
  });

  it('should be able to stop \'express\' http server', function test() {
    return this.service.close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        return Promise.resolve(result.value());
      })
      .spread(() => {
        expect(this.service.http.server.listening).to.be.eq(false);
      });
  });

  it('should attach \'socket.io\' when plugin is included', function test(done) {
    const service = new Mservice({
      plugins: ['validator', 'http', 'socketio'],
      http: {
        server: {
          attachSocketIO: true,
          handler: 'express',
          port: 3000,
        }
      },
      socketio: global.SERVICES.socketio,
    });

    service.connect()
      .then(() => {
        const client = SocketIOClient('http://0.0.0.0:3000');
        client.on('echo', data => {
          expect(data.message).to.be.eq('foo');
          service.close().then(() => done());
        });
        client.emit('echo', { message: 'foo' });
      });
  });
});
