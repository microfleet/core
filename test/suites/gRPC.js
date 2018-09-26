const path = require('path');
const Promise = require('bluebird');
const request = require('request-promise');
const assert = require('assert');
const { inspectPromise } = require('@makeomatic/deploy');

describe('Http server with \'gRPC\' handler', function testSuite() {
  const Mservice = require('../../src');
  const { initClient } = require('../gRPC/helpers');

  it('should starts \'gRPC\' http server when plugin is included', function test() {
    this.service = new Mservice({
      plugins: ['validator', 'logger', 'router', 'gRPC'],
      logger: {
        defaultLogger: true,
      },
      validator: {
        ajv: {
          useDefaults: true,
        },
      },
      gRPC: {
        proto: {
          definitions: path.resolve(__dirname, '../gRPC/proto/echo.proto'),
        },
        implements: 'test.echo.Test',
      },
      router: {
        routes: {
          directory: path.resolve(__dirname, '../gRPC/actions'),
          transports: ['gRPC'],
        },
      },
    });
    return this.service.connect()
      .reflect()
      .then(inspectPromise())
      .spread(() => {
        assert(this.service.gRPC.started);
      });
  });

  // TODO stop server
  it.skip('should be able to stop \'gRPC\' server', function test() {
    return this.service.close()
      .reflect()
      .then(inspectPromise())
      .then(() => {
        assert(this.service.gRPC.started !== undefined);
        // assert(this.service.gRPC.started === false);
      });
  });

  it('should be able to handle unary request', async function test() {
    const { config } = this.service;
    const client = this.client = initClient(config.gRPC.implements, config.gRPC);

    await Promise.fromCallback(client.waitForReady.bind(client, Date.now() + 10 * 1000));
    await Promise.fromCallback((callback) => {
      const message = { text: 'hellop' };
      client.echo(message, (err, res) => {
        assert(res);
        assert(res.text);
        assert.equal(res.text, message.text);
        callback(err, res);
      });
    });
  });

  it('should be able to handle request stream', function test(done) {
    const sentence = 'this is an example sentence';
    const stream = this.client.echoClientStream((err, res) => {
      console.log(err, res);
      done();
    });

    for (const word of sentence.split(' ')) {
      console.log('word:', word);
      stream.write({ text: word });
    }

    stream.end();
  });
});
