'use strict';

const assert = require('assert');
const debug = require('debug')('mservice:socketIO');
const is = require('is');
const SocketIO = require('socket.io');
const attachRouter = require('./socketIO/router/attach');

/**
 * @todo add adapter factory
 */
function attachSocketIO(config = {}) {
  debug('Attaching socketIO plugin');
  const service = this;

  if (is.fn(this.validateSync)) {
    assert.ifError(this.validateSync('socketIO', config).error);
  }

  const socketIO = new SocketIO(config.options);

  if (config.router.enabled) {
    attachRouter(socketIO, config.router, service.router);
  }

  this._socketIO = socketIO;
}

module.exports = {
  attach: attachSocketIO,
  name: 'socketIO'
};