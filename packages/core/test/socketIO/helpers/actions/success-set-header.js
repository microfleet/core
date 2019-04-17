const { ActionTransport } = require('./../../../../src');

function SuccessSetHeaderAction({ setResponseHeader }) {
  setResponseHeader('x-wow-your-personal-header', 'wow so valuable');

  return { redirected: true };
}

SuccessSetHeaderAction.transports = [ActionTransport.socketIO];

module.exports = SuccessSetHeaderAction;
