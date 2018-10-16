const { ActionTransport } = require('./../../../../src');

function rawBodyAction({ transportRequest }) {

  if (Buffer.isBuffer(transportRequest.payload)) {
    return transportRequest.payload;
  }

  return new Error('It is not buffer!!!');
}

rawBodyAction.transports = [ActionTransport.http];
rawBodyAction.transportOptions = {
  handlers: {
    hapi: {
      config: {
        payload: {
          output: 'data',
          parse: false,
        },
      },
      method: ['POST'],
    },
  },
};

module.exports = rawBodyAction;
