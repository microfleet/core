const Promise = require('bluebird');
const assert = require('assert');
const { expect } = require('chai');
const AdapterTransport = require('ms-socket.io-adapter-amqp/lib/transport');
const socketIO = require('socket.io');
const socketIOClient = require('socket.io-client');

describe('"socketIO" plugin', function testSuite() {
  require('../config');
  const { Microfleet } = require('../..');

  it('should not init socketIO when plugin is not included', function test() {
    const service = new Microfleet({ name: 'tester', plugins: [] });
    assert(!service.socketIO);
  });

  it('should create \'socketIO\' instance when plugin is included', function test() {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'socketIO'],
      socketIO: {},
    });
    expect(service.socketIO).to.be.instanceof(socketIO);
  });

  it('should attach routes after start', function test(done) {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'socketIO'],
      socketIO: global.SERVICES.socketIO,
      router: global.SERVICES.router,
    });
    service.socketIO.listen(3000);
    const client = socketIOClient('http://0.0.0.0:3000');
    client.emit('echo', { message: 'foo' }, { simpleResponse: true }, (error, response) => {
      expect(error).to.be.equals(null);
      expect(response).to.be.deep.equals({ message: 'foo' });
      service.socketIO.close();
      done();
    });
  });

  it('should be able to set up AMQP adapter', function test(done) {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'socketIO'],
      socketIO: {
        options: {
          adapter: {
            name: 'amqp',
            options: {
              connection: {
                host: 'rabbitmq',
                port: 5672,
              },
            },
          },
        },
      },
    });

    expect(service.socketIO.sockets.adapter.transport).to.be.instanceof(AdapterTransport);
    done();
  });

  it('should be able to set response header', (done) => {
    const service = new Microfleet({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'socketIO'],
      socketIO: global.SERVICES.socketIO,
      router: global.SERVICES.router,
    });

    service.socketIO.listen(3000);
    const client = socketIOClient('http://0.0.0.0:3000');
    client.emit('success-set-header', {}, { simpleResponse: false }, (error, response) => {
      expect(error).to.be.equals(null);
      expect(response).to.be.deep.equals({
        headers: {
          'x-your-response-header': 'header value',
        }
      });

      service.socketIO.close();
      done();
    });
  });
});
