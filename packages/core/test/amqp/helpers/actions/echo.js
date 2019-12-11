const { ActionTransport } = require('../../../..');

function EchoAction(request) {
  return request.params;
}

EchoAction.transports = [ActionTransport.amqp, ActionTransport.internal];

module.exports = EchoAction;
