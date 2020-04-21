const { ActionTransport } = require('./../../../../src');

function SuccessRemoveHeaderAction(serviceRequest) {
  serviceRequest.setReplyHeader('x-your-response-header', 'header value');
  serviceRequest.setReplyHeader('x-remove-me', 'not so valuable');
  serviceRequest.removeReplyHeader('x-remove-me');
}

SuccessRemoveHeaderAction.transports = [ActionTransport.amqp];

module.exports = SuccessRemoveHeaderAction;
