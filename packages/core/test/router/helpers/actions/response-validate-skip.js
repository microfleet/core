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

responseValidate.skipResponseValidation = true
responseValidate.responseSchema = 'response.response-validate'
responseValidate.transports = [
  ActionTransport.amqp,
  ActionTransport.http,
  ActionTransport.socketIO,
];

module.exports = responseValidate;
