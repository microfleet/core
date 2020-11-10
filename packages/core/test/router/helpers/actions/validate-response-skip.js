const { ActionTransport } = require('./../../../..');

async function skipResponseValidate(request) {
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

skipResponseValidate.validateResponse = false
skipResponseValidate.responseSchema = 'response.validate-response'
skipResponseValidate.schema = 'validate-response'

skipResponseValidate.transports = [
  ActionTransport.amqp,
  ActionTransport.http,
  ActionTransport.socketio,
];

module.exports = skipResponseValidate;
