const { ActionTransport } = require('./../../../../src');

function SuccessRemoveHeaderAction({ setResponseHeader, removeResponseHeader }) {
  setResponseHeader('x-wow-your-personal-header', 'wow so valuable');
  setResponseHeader('x-remove-me', 'not so valuable');
  removeResponseHeader('x-remove-me');

  return { redirected: true };
}

SuccessRemoveHeaderAction.transports = [ActionTransport.http];

module.exports = SuccessRemoveHeaderAction;
