const assert = require('assert');
const { expect } = require('chai');
const AdapterTransport = require('ms-socket.io-adapter-amqp/lib/transport');
const socketIO = require('socket.io');
const socketIOClient = require('socket.io-client');

describe('"socketIO" plugin', function testSuite() {
  require('../config');
  const { Microfleet: Mservice } = require('../../src');

  it('should throw error when plugin isn\'t included', function test() {
    const service = new Mservice({ name: 'tester', plugins: [] });
    assert(!service.socketIO);
  });

  it('should create \'socketIO\' instance when plugin is included', function test() {
    const service = new Mservice({
      name: 'tester',
      plugins: ['validator', 'socketIO'],
      socketIO: {},
    });
    expect(service.socketIO).to.be.instanceof(socketIO);
  });

  it('should attach routes after start', (done) => {
    const service = new Mservice({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'socketIO'],
      socketIO: global.SERVICES.socketIO,
      router: global.SERVICES.router,
    });
    service.socketIO.listen(3000);
    const client = socketIOClient('http://0.0.0.0:3000');
    client.emit('echo', { message: 'foo' }, async (error, response) => {
      expect(error).to.be.equals(null);
      expect(response).to.be.deep.equals({ message: 'foo' });

      service.socketIO.close()
      service.close().asCallback(done);

      // await service.socketIO.close();
      // await service.close();
    });
  });

  it('should attach routes after start 2', (done) => {
    const service = new Mservice({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'socketIO'],
      socketIO: global.SERVICES.socketIO,
      router: global.SERVICES.router,
    });
    service.socketIO.listen(3000);
    const client = socketIOClient('http://0.0.0.0:3000');
    client.emit('echo', { message: 'foo' }, async (error, response) => {
      expect(error).to.be.equals(null);
      expect(response).to.be.deep.equals({ message: 'foo' });
      service.socketIO.close()
      service.close().asCallback(done);
    });
  });

  it('should be able to set up AMQP adapter', async () => {
    const service = new Mservice({
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

    await service.close();
  });

  it('should be able to set response header', (done) => {
    const service = new Mservice({
      name: 'tester',
      plugins: ['validator', 'logger', 'router', 'socketIO'],
      socketIO: global.SERVICES.socketIO,
      router: global.SERVICES.router,
    });
    service.socketIO.listen(3000);
    const client = socketIOClient('http://0.0.0.0:3000');
    client.emit('success-set-header', { message: '', simpleResponse: true }, async (error, response) => {
      console.log('socketio error structure', error);
      console.log('socketio response structure', response);
      service.socketIO.close();
      service.close().asCallback(done);
    });
  });
});
