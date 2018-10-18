const assert = require('assert');
const { expect } = require('chai');
const AdapterTransport = require('ms-socket.io-adapter-amqp/lib/transport');
const socketIO = require('socket.io');
const socketIOClient = require('socket.io-client');

describe('"socketIO" plugin', function testSuite() {
  require('../config');
  const { Microfleet: Mservice } = require('../../src/microfleet');

  it('should throw error when plugin isn\'t included', function test() {
    const service = new Mservice({ plugins: [] });
    assert(!service.socketIO);
  });

  it('should create \'socketIO\' instance when plugin is included', function test() {
    const service = new Mservice({
      plugins: ['validator', 'socketIO'],
      socketIO: {},
    });
    expect(service.socketIO).to.be.instanceof(socketIO);
  });

  it('should attach routes after start', function test(done) {
    const service = new Mservice({
      plugins: ['validator', 'logger', 'router', 'socketIO'],
      socketIO: global.SERVICES.socketIO,
      router: global.SERVICES.router,
    });
    service.socketIO.listen(3000);
    const client = socketIOClient('http://0.0.0.0:3000');
    client.emit('echo', { message: 'foo' }, (error, response) => {
      expect(error).to.be.equals(null);
      expect(response).to.be.deep.equals({ message: 'foo' });
      service.close().asCallback(done);
    });
  });

  it('should be able to set up AMQP adapter', function test(done) {
    const service = new Mservice({
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
});
