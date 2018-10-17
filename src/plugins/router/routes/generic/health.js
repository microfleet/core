const { HttpStatusError } = require('common-errors');
const { ActionTransport, PLUGIN_STATUS_FAIL } = require('../../../../constants');

async function GenericHealthCheck(): Object {
  const data = await this.getHealthStatus();

  if (PLUGIN_STATUS_FAIL === data.status) {
    throw HttpStatusError(500, `Unhealthy due to following plugins: ${data.failed.map(it => it.name).join(', ')}`);
  }

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
