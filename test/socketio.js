const { expect } = require('chai');
const express = require('express');
const http = require('http');
const SocketIO = require('socket.io');
const SocketIOClient = require('socket.io-client');

describe('SocketIO suite', function testSuite() {
  const Mservice = require('../src');

  it('should throw error when plugin isn\'t included', function test() {
    const service = new Mservice({ plugins: [] });
    expect(() => service.socketio).to.throw();
  });


  it('should create \'SocketIO\' instance when plugin is included', function test() {
    const service = new Mservice({
      plugins: ['validator', 'socketio'],
      socketio: global.SERVICES.socketio,
    });
    expect(service.socketio).to.be.instanceof(SocketIO);
  });

  it('should attach routes after start', function test(done) {
    const service = new Mservice({
      plugins: ['validator', 'socketio'],
      socketio: global.SERVICES.socketio,
    });
    service.socketio.listen(3000);
    const client = SocketIOClient('http://0.0.0.0:3000');
    client.on('echo', data => {
      expect(data.message).to.be.eq('foo');
      service.socketio.close();
      done();
    });
    client.emit('echo', { message: 'foo' });
  });

  it('should validate requets params', function test(done) {
    const service = new Mservice({
      plugins: ['validator', 'socketio'],
      socketio: global.SERVICES.socketio,
    });
    service.socketio.listen(3000);
    const client = SocketIOClient('http://0.0.0.0:3000');
    client.on('error', data => {
      expect(data.message).to.be.eq('socketio_actions_echo validation failed: data.message should be string');
      service.socketio.close();
      done();
    });
    client.emit('echo', { message: ['foo'] });
  });
});
