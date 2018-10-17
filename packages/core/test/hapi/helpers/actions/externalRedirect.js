const { ActionTransport } = require('./../../../../src');

function RedirectAction(request) {
  return request.transportRequest.redirect('https://google.com');
}

RedirectAction.transports = [ActionTransport.http];

module.exports = RedirectAction;
