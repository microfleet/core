'use strict';

var _require = require('./../../../../../');

const ActionTransport = _require.ActionTransport;

const Promise = require('bluebird');

function BarAction() {
  return Promise.resolve('bar');
}

BarAction.transports = [ActionTransport.http];

module.exports = BarAction;