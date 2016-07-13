const assert = require('assert');
const debug = require('debug')('mservice:socketIO');
const Errors = require('common-errors');
const is = require('is');
const SocketIO = require('socket.io');
const getSocketIORouter = require('./socketIO/router');

/**
 * @todo add adapter factory
 */
function attachSocketIO(config = {}) {
  debug('Attaching socketIO plugin');

  if (is.fn(this.validateSync)) {
    assert.ifError(this.validateSync('socketIO', config).error);
  }

  const socketIO = new SocketIO(config.options);

  if (config.router.enabled) {
    assert(this.router);
    socketIO.on('connection', getSocketIORouter(config.router, this.router));
  }

  this._socketIO = socketIO;
}

module.exports = {
  attach: attachSocketIO,
  name: 'socketIO',
};
