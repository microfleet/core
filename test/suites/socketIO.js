const { expect } = require('chai');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const socketIOClient = require('socket.io-client');

describe('socketIO suite', function testSuite() {
  const Mservice = require('../../src');

  it('should throw error when plugin isn\'t included', function test() {
    const service = new Mservice({ plugins: [] });
    expect(() => service.socketIO).to.throw();
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
    client.emit('action', { action: 'action.echo', message: 'foo' }, (error, response) => {
      expect(error).to.be.equals(null);
      expect(response).to.be.deep.equals({ message: 'foo' });
      service.close().asCallback(done);
    });
  });
});
