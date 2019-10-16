const path = require('path');
const Promise = require('bluebird');
const cheerio = require('cheerio');
const request = require('request-promise');
const SocketIOClient = require('socket.io-client');
const assert = require('assert');

describe('Http server with \'hapi\' handler', function testSuite() {
  require('../config');
  const { Microfleet } = require('../..');
  let service;

  it('should starts \'hapi\' http server when plugin is included', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'opentracing', 'http'],
      http: {
        server: {
          handler: 'hapi',
          port: 3000,
        },
        router: {
          enabled: false,
        },
      },
    });

    const [server] = await service.connect();

    assert.equal(server, service.http);
    assert.equal(service.http.info.started !== undefined, true);
    assert.equal(service.http.info.started > 0, true);
  });

  it('should be able to stop \'hapi\' http server', async () => {
    await service.close();

    assert.equal(service.http.info.started !== undefined, true);
    assert.equal(service.http.info.started === 0, true);
  });

  it('should be able to attach \'socketIO\' plugin', async () => {
    service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'opentracing', 'router', 'http', 'socketIO'],
      http: {
        server: {
          attachSocketIO: true,
          handler: 'hapi',
          port: 3000,
        },
        router: {
          enabled: false,
        },
      },
      logger: {
        defaultLogger: true,
      },
      socketIO: global.SERVICES.socketIO,
      router: global.SERVICES.router,
    });

    await service.connect();

    await new Promise((resolve, reject) => {
      const client = SocketIOClient('http://0.0.0.0:3000');
      client.on('error', reject);
      client.emit('echo', { message: 'foo' }, (error, response) => {
        client.close();
        assert.equal(error, null);
        assert.deepEqual(response, { message: 'foo' });
        service.close().then(resolve).catch(reject);
      });
    });
  });

  it('should be able to attach \'router\' plugin', async () => {
    service = new Microfleet({
      name: 'tester',
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
          directory: path.resolve(__dirname, './../socketIO/helpers/actions'),
          enabled: {
            echo: 'echo',
          },
          transports: ['http'],
        },
        extensions: { register: [] },
      },
    });

    await service.connect();

    const options = {
      json: true,
      method: 'POST',
      resolveWithFullResponse: true,
      simple: false,
      uri: 'http://0.0.0.0:3000/echo',
      body: { message: 'foo' },
    };

    try {
      await Promise.all([
        request(options).then((response) => {
          assert.equal(response.statusCode, 200);
          assert.deepEqual(response.body, { message: 'foo' });
          return null;
        }),
        request({ ...options, uri: 'http://0.0.0.0:3000/not-found' }).then((response) => {
          assert.equal(response.statusCode, 404);
          assert.equal(response.body.name, 'NotFoundError');
          assert.deepEqual(response.body.message, 'Not Found: "route "not-found" not found"');
          return null;
        }),
      ]);
    } finally {
      await service.close();
    }
  });

  it('should be able to use \'router\' plugin prefix', async () => {
    service = new Microfleet({
      name: 'tester',
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
          directory: path.resolve(__dirname, './../socketIO/helpers/actions'),
          enabled: {
            echo: 'echo',
          },
          prefix: 'foo.bar',
          transports: ['http'],
        },
        extensions: { register: [] },
      },
    });

    await service.connect();

    const options = {
      json: true,
      method: 'POST',
      resolveWithFullResponse: true,
      simple: false,
      uri: 'http://0.0.0.0:3000/foo/bar/echo',
      body: { message: 'foo' },
    };

    try {
      const response = await request(options);
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, { message: 'foo' });
    } finally {
      await service.close();
    }
  });

  it('should be able to use \'hapi\' plugin prefix', async () => {
    service = new Microfleet({
      name: 'tester',
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
          directory: path.resolve(__dirname, './../socketIO/helpers/actions'),
          enabled: {
            echo: 'echo',
          },
          transports: ['http'],
        },
        extensions: { register: [] },
      },
    });

    await service.connect();

    const options = {
      json: true,
      method: 'POST',
      resolveWithFullResponse: true,
      simple: false,
      uri: 'http://0.0.0.0:3000/foo/bar/echo',
      body: { message: 'foo' },
    };

    try {
      const response = await request(options);
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, { message: 'foo' });
    } finally {
      await service.close();
    }
  });

  it('should be able to use both \'hapi\' plugin prefix and \'router\' plugin prefix', async () => {
    service = new Microfleet({
      name: 'tester',
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
          directory: path.resolve(__dirname, './../socketIO/helpers/actions'),
          enabled: {
            echo: 'echo',
          },
          prefix: 'baz.foo',
          transports: ['http'],
        },
        extensions: { register: [] },
      },
    });

    await service.connect();

    const options = {
      json: true,
      method: 'POST',
      resolveWithFullResponse: true,
      simple: false,
      uri: 'http://0.0.0.0:3000/foo/bar/baz/foo/echo',
      body: { message: 'foo' },
    };

    try {
      const response = await request(options);
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, { message: 'foo' });
    } finally {
      await service.close();
    }
  });

  it('should be able to pass custom options to hapi route', async () => {
    service = new Microfleet({
      name: 'tester',
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
          directory: path.resolve(__dirname, './../hapi/helpers/actions'),
          enabled: {
            'hapi-raw-body': 'hapi-raw-body',
          },
          transports: ['http'],
        },
        extensions: { register: [] },
      },
    });

    await service.connect();

    try {
      const response = await request({
        method: 'POST',
        resolveWithFullResponse: true,
        simple: false,
        uri: 'http://0.0.0.0:3000/hapi-raw-body',
        body: '{"status":"😿"}',
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.body, '{"status":"😿"}');
    } finally {
      await service.close();
    }
  });

  describe('should be able to use hapi\'s plugins', async () => {
    before(async () => {
      service = new Microfleet({
        name: 'tester',
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
                path: path.resolve(__dirname, './../hapi/templates'),
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
            directory: path.resolve(__dirname, './../hapi/helpers/actions'),
            transports: ['http'],
          },
          extensions: { register: [] },
        },
      });

      await service.connect();
    });

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
