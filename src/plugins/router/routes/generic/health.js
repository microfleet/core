const { ActionTransport } = require('../../../../constants');

function GenericHealthCheck(): Object {
  return {
    data: {
      status: 'ok',
    },
  };
}

// to avoid 'setTransportAsDefault: false' and make things obvious
GenericHealthCheck.transports = [
  ActionTransport.http,
  ActionTransport.amqp,
  ActionTransport.internal,
  ActionTransport.socketIO,
];

module.exports = GenericHealthCheck;
