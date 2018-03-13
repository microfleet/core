/* eslint-env node, mocha */
/* eslint-disable prefer-arrow-callback, promise/always-return */
const path = require('path');
const Promise = require('bluebird');
const cheerio = require('cheerio');
const request = require('request-promise');
const SocketIOClient = require('socket.io-client');
const assert = require('assert');
const { inspectPromise } = require('@makeomatic/deploy');

describe('Http server with \'hapi\' handler', function testSuite() {
  const Mservice = require('@microfleet/core');

  it('should starts \'hapi\' http server when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'opentracing', 'http'],
      http: {
        server: {
          handler: 'hapi',
          port: 3000,
        },
      },
    });

    return this.service.connect()
      .reflect()
      .then(inspectPromise())
      .spread((server) => {
        assert.equal(server, this.service.http);
        assert.equal(this.service.http.info.started !== undefined, true);
        assert.equal(this.service.http.info.started > 0, true);
      });
  });

  it('should be able to stop \'hapi\' http server', function test() {
    return this.service.close()
      .reflect()
      .then(inspectPromise())
      .then(() => {
        assert.equal(this.service.http.info.started !== undefined, true);
        assert.equal(this.service.http.info.started === 0, true);
      });
  });

  it('should be able to attach \'socketIO\' plugin', function test(done) {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'opentracing', 'router', 'http', 'socket-io'],
      http: {
        server: {
          attachSocketIO: true,
          handler: 'hapi',
          port: 3000,
        },
      },
      logger: {
        defaultLogger: true,
      },
      socketIO: global.SERVICES.socketIO,
      router: global.SERVICES.router,
    });

    service.connect()
      .then(() => {
        const client = SocketIOClient('http://0.0.0.0:3000');
        client.on('error', done);
        client.emit('echo', { message: 'foo' }, (error, response) => {
          client.close();
          assert.equal(error, null);
          assert.deepEqual(response, { message: 'foo' });
          service.close().asCallback(done);
        });
      })
      .catch(done);
  });

  it('should be able to attach \'router\' plugin', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'opentracing', 'router', 'http'],
      http: {
        server: {
          handler: 'hapi',
          port: 3000,
        },
        router: {
          enabled: true,
        },
      },
      logger: {
        defaultLogger: true,
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, './socketIO/helpers/actions'),
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

        return Promise
          .all([
            request(options).then((response) => {
              assert.equal(response.statusCode, 200);
              assert.deepEqual(response.body, { message: 'foo' });
            }),
            request(Object.assign({}, options, { uri: 'http://0.0.0.0:3000/not-found' })).then((response) => {
              assert.equal(response.statusCode, 404);
              assert.equal(response.body.name, 'NotFoundError');
              assert.deepEqual(response.body.message, 'Not Found: "route "not-found" not found"');
            }),
          ])
          .reflect()
          .then(inspectPromise())
          .then(() => {
            return service.close();
          });
      });
  });

  it('should be able to use \'router\' plugin prefix', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'opentracing', 'router', 'http'],
      http: {
        server: {
          handler: 'hapi',
          port: 3000,
        },
        router: {
          enabled: true,
        },
      },
      logger: {
        defaultLogger: true,
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, './socketIO/helpers/actions'),
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

        return request(options).then((response) => {
          assert.equal(response.statusCode, 200);
          assert.deepEqual(response.body, { message: 'foo' });

          return service.close();
        });
      });
  });

  it('should be able to use \'hapi\' plugin prefix', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'opentracing', 'router', 'http'],
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
      logger: {
        defaultLogger: true,
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, './socketIO/helpers/actions'),
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

        return request(options).then((response) => {
          assert.equal(response.statusCode, 200);
          assert.deepEqual(response.body, { message: 'foo' });

          return service.close();
        });
      });
  });

  it('should be able to use both \'hapi\' plugin prefix and \'router\' plugin prefix', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'opentracing', 'router', 'http'],
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
      logger: {
        defaultLogger: true,
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, './socketIO/helpers/actions'),
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

        return request(options).then((response) => {
          assert.equal(response.statusCode, 200);
          assert.deepEqual(response.body, { message: 'foo' });

          return service.close();
        });
      });
  });

  describe('should be able to use hapi\'s plugins', () => {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'opentracing', 'router', 'http'],
      http: {
        server: {
          handler: 'hapi',
          port: 3000,
          handlerConfig: {
            views: {
              engines: {
                hbs: require('handlebars'),
              },
              path: path.resolve(__dirname, './hapi/templates'),
            },
          },
        },
        router: {
          enabled: true,
          prefix: 'foo.bar',
        },
      },
      logger: {
        defaultLogger: true,
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, './hapi/helpers/actions'),
          transports: ['http'],
        },
      },
    });

    before(() => service.connect());
    after(() => service.close());

    it('should be able to send html view', () => {
      const options = {
        json: true,
        method: 'post',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/foo/bar/view',
        body: {
          title: 'title',
          content: 'content',
        },
      };

      return request(options).then((response) => {
        assert.equal(response.statusCode, 200);
        assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
        assert.equal(typeof response.body, 'string');

        const page = cheerio.load(response.body);
        assert.equal(page('title').html().trim(), options.body.title);
        assert.equal(page('div#content').html().trim(), options.body.content);

        return true;
      });
    });

    it('should be able to redirect', () => {
      const options = {
        json: true,
        method: 'get',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/foo/bar/redirect',
      };

      return request(options).then((response) => {
        assert.equal(response.statusCode, 200);
        assert.deepEqual(response.body, { redirected: true });

        return true;
      });
    });

    it('should be able to redirect', () => {
      const options = {
        method: 'get',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/foo/bar/externalRedirect',
      };

      return request(options).then((response) => {
        assert.equal(response.statusCode, 200);
        assert.equal(typeof response.body, 'string');

        return true;
      });
    });
  });
});
