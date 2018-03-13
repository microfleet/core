const { ActionTransport } = require('@microfleet/core');
const Promise = require('bluebird');

function BazAction() {
  return Promise.resolve('bar');
}

BazAction.transports = [ActionTransport.socketIO];

module.exports = BazAction;
