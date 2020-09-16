const Promise = require('bluebird');
const { ActionTransport } = require('../../../..');

function EchoAction(request) {
  return Promise.resolve(request.params);
}

EchoAction.transports = [ActionTransport.socketio, ActionTransport.http];

module.exports = EchoAction;
