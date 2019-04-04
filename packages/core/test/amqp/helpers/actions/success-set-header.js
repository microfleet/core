const { ActionTransport } = require('./../../../../src');

function SuccessSetHeaderAction({ setHeader }) {
  setHeader('x-wow-your-personal-header', 'wow so valuable');

  return { redirected: true };
}

SuccessSetHeaderAction.transports = [ActionTransport.amqp];

module.exports = SuccessSetHeaderAction;
