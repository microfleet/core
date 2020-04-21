const { ActionTransport } = require('./../../../../src');

function SuccessSetHeaderAction(serviceRequest) {
  serviceRequest.setReplyHeader('x-your-response-header', 'header value');
}

SuccessSetHeaderAction.transports = [ActionTransport.http];

module.exports = SuccessSetHeaderAction;
