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

responseValidate.validateResponse = false
responseValidate.responseSchema = 'response.validate-response'
responseValidate.transports = [
  ActionTransport.amqp,
  ActionTransport.http,
  ActionTransport.socketIO,
];

module.exports = responseValidate;
