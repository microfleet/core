const { ActionTransport } = require('./../../../../src');

function SuccessRemoveHeaderAction({ setHeader, removeHeader }) {
  setHeader('x-wow-your-personal-header', 'wow so valuable');
  setHeader('x-remove-me', 'not so valuable');
  removeHeader('x-remove-me');

  return { redirected: true };
}

SuccessRemoveHeaderAction.transports = [ActionTransport.amqp];

module.exports = SuccessRemoveHeaderAction;
