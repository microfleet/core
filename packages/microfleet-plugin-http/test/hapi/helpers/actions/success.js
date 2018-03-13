const { ActionTransport } = require('@microfleet/core');

function SuccessAction() {
  return { redirected: true };
}

SuccessAction.transports = [ActionTransport.http];

module.exports = SuccessAction;
