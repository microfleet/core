const { ActionTransport } = require('./../../../..');

async function responseValidate(request) {
  if (request.params.success) {
    return {
      validResponse: true
    }
  }

  return {
    validResponse: false,
    withAdditionalProperty: true
  }
}

responseValidate.responseSchema = 'response.validate-response'
responseValidate.schema = 'validate-response'
responseValidate.transports = [
  ActionTransport.amqp,
  ActionTransport.http,
  ActionTransport.socketio,
];

module.exports = responseValidate;
