const { ActionTransport } = require('../../../../../../../shared/constants');
const Promise = require('bluebird');

function BarAction() {
  return Promise.resolve('bar');
}

BarAction.transports = [ActionTransport.http];

module.exports = BarAction;
