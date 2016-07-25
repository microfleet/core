'use strict';

var _require = require('./../../../../../');

const ActionTransport = _require.ActionTransport;

const Promise = require('bluebird');

function FooAction() {
  return Promise.resolve('foo');
}

FooAction.transports = [ActionTransport.http, ActionTransport.socketIO];

module.exports = FooAction;