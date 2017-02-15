const { expect } = require('chai');
const express = require('express');
const http = require('http');
const path = require('path');
const request = require('request-promise');
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
      plugins: ['validator', 'logger', 'router', 'http', 'socketIO'],
      http: {
        server: {
          attachSocketIO: true,
          handler: 'express',
          port: 3000,
        }
      },
      logger : {
        defaultLogger: true,
      },
      socketIO: global.SERVICES.socketIO,
      router: global.SERVICES.router,
    });

    service.connect()
      .then(() => {
        const client = SocketIOClient('http://0.0.0.0:3000');
        client.emit('echo', { message: 'foo' }, (error, response) => {
          expect(error).to.be.equals(null);
          expect(response).to.be.deep.equals({ message: 'foo' });
          service.close().asCallback(done);
        });
      });
  });

  it('should be able to attach \'router\' plugin', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'router', 'http'],
      http: {
        server: {
          handler: 'express',
          port: 3000,
        },
        router: {
          enabled: true,
        },
      },
      logger : {
        defaultLogger: true,
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, './../socketIO/helpers/actions'),
          enabled: {
            echo: 'echo',
          },
          transports: ['http'],
        },
      },
    });

    return service.connect()
      .then(() => {
        const options = {
          json: true,
          method: 'POST',
          resolveWithFullResponse: true,
          simple: false,
          uri: 'http://0.0.0.0:3000/echo',
          body: { message: 'foo' },
        };

        return request(options).then(response => {
          expect(response.statusCode).to.be.equals(200);
          expect(response.body).to.be.deep.equals({ message: 'foo' });

          return service.close();
        });
      });
  });

  it('should be able to use \'router\' plugin prefix', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'router', 'http'],
      http: {
        server: {
          handler: 'express',
          port: 3000,
        },
        router: {
          enabled: true,
        },
      },
      logger : {
        defaultLogger: true,
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, './../socketIO/helpers/actions'),
          enabled: {
            echo: 'echo',
          },
          prefix: 'foo.bar',
          transports: ['http'],
        },
      },
    });

    return service.connect()
      .then(() => {
        const options = {
          json: true,
          method: 'POST',
          resolveWithFullResponse: true,
          simple: false,
          uri: 'http://0.0.0.0:3000/foo/bar/echo',
          body: { message: 'foo' },
        };

        return request(options).then(response => {
          expect(response.statusCode).to.be.equals(200);
          expect(response.body).to.be.deep.equals({ message: 'foo' });

          return service.close();
        });
      });
  });

  it('should be able to use \'express\' plugin prefix', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'router', 'http'],
      http: {
        server: {
          handler: 'express',
          port: 3000,
        },
        router: {
          enabled: true,
          prefix: 'foo.bar',
        },
      },
      logger : {
        defaultLogger: true,
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, './../socketIO/helpers/actions'),
          enabled: {
            echo: 'echo',
          },
          transports: ['http'],
        },
      },
    });

    return service.connect()
      .then(() => {
        const options = {
          json: true,
          method: 'POST',
          resolveWithFullResponse: true,
          simple: false,
          uri: 'http://0.0.0.0:3000/foo/bar/echo',
          body: { message: 'foo' },
        };

        return request(options).then(response => {
          expect(response.statusCode).to.be.equals(200);
          expect(response.body).to.be.deep.equals({ message: 'foo' });

          return service.close();
        });
      });
  });

  it('should be able to use both \'express\' plugin prefix and \'router\' plugin prefix', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'router', 'http'],
      http: {
        server: {
          handler: 'express',
          port: 3000,
        },
        router: {
          enabled: true,
          prefix: 'foo.bar',
        },
      },
      logger : {
        defaultLogger: true,
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, './../socketIO/helpers/actions'),
          enabled: {
            echo: 'echo',
          },
          prefix: 'baz.foo',
          transports: ['http'],
        },
      },
    });

    return service.connect()
      .then(() => {
        const options = {
          json: true,
          method: 'POST',
          resolveWithFullResponse: true,
          simple: false,
          uri: 'http://0.0.0.0:3000/foo/bar/baz/foo/echo',
          body: { message: 'foo' },
        };

        return request(options).then(response => {
          expect(response.statusCode).to.be.equals(200);
          expect(response.body).to.be.deep.equals({ message: 'foo' });

          return service.close();
        });
      });
  });
});
