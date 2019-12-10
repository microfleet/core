const Promise = require('bluebird');
const { ActionTransport } = require('../../../..');

function EchoAction(request) {
  return Promise.resolve(request.params);
}

EchoAction.transports = [ActionTransport.amqp, ActionTransport.internal];

module.exports = EchoAction;
