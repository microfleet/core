const { ActionTransport } = require('./../../../../src');

function SuccessAction() {
  return { redirected: true };
}

SuccessAction.transports = [ActionTransport.amqp];

module.exports = SuccessAction;
