const { ActionTransport } = require('../../../../constants');

async function GenericHealthCheck(): Object {
  const data = await this.getHealthStatus();
  return { data };
}

// to avoid 'setTransportAsDefault: false' and make things obvious
GenericHealthCheck.transports = [
  ActionTransport.http,
  ActionTransport.amqp,
  ActionTransport.internal,
  ActionTransport.socketIO,
];

module.exports = GenericHealthCheck;
