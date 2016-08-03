const { expect } = require('chai');
const path = require('path');
const request = require('request-promise');
const SocketIOClient = require('socket.io-client');

describe('Http server with \'hapi\' handler', function testSuite() {
  const Mservice = require('../../src');

  it('should starts \'hapi\' http server when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'http'],
      http: {
        server: {
          handler: 'hapi',
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
        expect(server).to.be.equals(this.service.http);
        expect(this.service.http.info.started !== undefined).to.be.equals(true);
        expect(this.service.http.info.started > 0).to.be.equals(true);
      });
  });

  it('should be able to stop \'hapi\' http server', function test() {
    return this.service.close()
      .reflect()
      .then(result => {
        expect(result.isFulfilled()).to.be.eq(true);
        expect(this.service.http.info.started !== undefined).to.be.equals(true);
        expect(this.service.http.info.started === 0).to.be.equals(true);
      });
  });

  it('should be able to attach \'socketIO\' plugin', function test(done) {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'router', 'http', 'socketIO'],
      http: {
        server: {
          attachSocketIO: true,
          handler: 'hapi',
          port: 3000,
        }
      },
      logger: true,
      socketIO: global.SERVICES.socketIO,
      router: global.SERVICES.router,
    });

    service.connect()
      .then(() => {
        const client = SocketIOClient('http://0.0.0.0:3000');
        client.on('error', done);
        client.emit('action', { action: 'echo', message: 'foo' }, (error, response) => {
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
          handler: 'hapi',
          port: 3000,
        },
        router: {
          enabled: true,
        },
      },
      logger: true,
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
          handler: 'hapi',
          port: 3000,
        },
        router: {
          enabled: true,
        },
      },
      logger: true,
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

  it('should be able to use \'hapi\' plugin prefix', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'router', 'http'],
      http: {
        server: {
          handler: 'hapi',
          port: 3000,
        },
        router: {
          enabled: true,
          prefix: 'foo.bar',
        },
      },
      logger: true,
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

  it('should be able to use both \'hapi\' plugin prefix and \'router\' plugin prefix', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'router', 'http'],
      http: {
        server: {
          handler: 'hapi',
          port: 3000,
        },
        router: {
          enabled: true,
          prefix: 'foo.bar',
        },
      },
      logger: true,
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
