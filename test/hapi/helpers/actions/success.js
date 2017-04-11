const { ActionTransport } = require('./../../../../src');

function SuccessAction() {
  return { redirected: true };
}

SuccessAction.transports = [ActionTransport.http];

module.exports = SuccessAction;
