const Promise = require('bluebird');
const { ActionTransport } = require('../../../src');

function EchoAction(request) {
  return Promise.resolve(request.params);
}

EchoAction.transports = [ActionTransport.gRPC];

module.exports = EchoAction;
