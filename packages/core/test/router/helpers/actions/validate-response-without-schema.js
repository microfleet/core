const { ActionTransport } = require('./../../../..');

async function withoutResponseSchema(request) {
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

withoutResponseSchema.schema = 'validate-response'
withoutResponseSchema.transports = [
  ActionTransport.amqp,
  ActionTransport.http,
  ActionTransport.socketIO,
];

module.exports = withoutResponseSchema;
