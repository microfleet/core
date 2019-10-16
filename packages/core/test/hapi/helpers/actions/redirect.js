const { ActionTransport } = require('./../../../..');

function RedirectAction(request) {
  return request.transportRequest.redirect('success');
}

RedirectAction.transports = [ActionTransport.http];

module.exports = RedirectAction;
