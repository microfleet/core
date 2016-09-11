const assert = require('assert');
const attachRouter = require('./socketIO/router/attach');
const debug = require('debug')('mservice:socketIO');
const Errors = require('common-errors');
const is = require('is');
const _require = require('../utils/require');

function attachSocketIO(config = {}) {
  debug('Attaching socketIO plugin');
  const service = this;
  const AdapterFactory = _require('ms-socket.io-adapter-amqp');
  const SocketIO = _require('socket.io');

  const adapters = {
    amqp: options => AdapterFactory.fromOptions(options),
  };

  if (is.fn(this.validateSync)) {
    assert.ifError(this.validateSync('socketIO', config).error);
  }

  const { options, router } = config;
  const { adapter } = options;

  if (is.object(adapter)) {
    if (adapters[adapter.name] === undefined) {
      throw new Errors.NotImplementedError(`Adapter ${adapter.name} is not implemented`);
    }

    options.adapter = adapters[adapter.name](adapter.options);
  }

  const socketIO = new SocketIO(options);

  if (router.enabled) {
    attachRouter(socketIO, router, service.router);
  }

  this._socketIO = socketIO;
}

module.exports = {
  attach: attachSocketIO,
  name: 'socketIO',
};
