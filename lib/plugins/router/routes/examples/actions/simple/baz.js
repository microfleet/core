'use strict';

var _require = require('./../../../../../../');

const ActionTransport = _require.ActionTransport;

const Promise = require('bluebird');

function BazAction() {
  return Promise.resolve('bar');
}

BazAction.transports = [ActionTransport.socketIO];

module.exports = BazAction;