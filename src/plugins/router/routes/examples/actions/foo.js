const { ActionTransport } = require('./../../../../../');
const Promise = require('bluebird');

function FooAction() {
  return Promise.resolve('foo');
}

FooAction.transports = [ActionTransport.http, ActionTransport.socketIO];

module.exports = FooAction;
